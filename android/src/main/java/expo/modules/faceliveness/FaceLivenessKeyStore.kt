package expo.modules.faceliveness

import android.os.Build
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyInfo
import android.security.keystore.KeyProperties
import android.util.Base64
import android.util.Log
import java.security.KeyFactory
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.PrivateKey
import java.security.Signature
import java.security.spec.ECGenParameterSpec

data class KeyMetadata(
    val alias: String,
    val publicKey: String, // Base64 X.509 SubjectPublicKeyInfo
    val algorithm: String, // "ECDSA_P256_SHA256"
    val isHardwareBacked: Boolean,
    val isStrongBoxBacked: Boolean
)

/**
 * Hardware-backed Key Management using Android Keystore.
 * Generates non-exportable ECDSA P-256 signing keys inside the device's
 * Trusted Execution Environment (TEE) or StrongBox Keymaster.
 *
 * Private key material NEVER leaves hardware key storage and is never
 * exposed to JavaScript runtime.
 */
class FaceLivenessKeyStore {

    companion object {
        private const val TAG = "FaceLivenessKeyStore"
        private const val ANDROID_KEYSTORE = "AndroidKeyStore"
        private const val EC_CURVE_P256 = "secp256r1"
    }

    private val keyStore: KeyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply {
        load(null)
    }

    /**
     * Generates a new non-exportable ECDSA P-256 signing key pair.
     * Overwrites any existing key with the same alias.
     */
    fun generateSigningKey(alias: String): KeyMetadata {
        // Delete existing key if present
        if (keyStore.containsAlias(alias)) {
            keyStore.deleteEntry(alias)
        }

        val kpg = KeyPairGenerator.getInstance(KeyProperties.KEY_ALGORITHM_EC, ANDROID_KEYSTORE)

        // Attempt StrongBox-backed key generation on Android 9+ (API 28+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            try {
                val strongBoxSpec = KeyGenParameterSpec.Builder(
                    alias,
                    KeyProperties.PURPOSE_SIGN or KeyProperties.PURPOSE_VERIFY
                )
                    .setAlgorithmParameterSpec(ECGenParameterSpec(EC_CURVE_P256))
                    .setDigests(KeyProperties.DIGEST_SHA256)
                    .setIsStrongBoxBacked(true)
                    .build()
                kpg.initialize(strongBoxSpec)
                kpg.generateKeyPair()
                Log.i(TAG, "StrongBox hardware key generated for alias: $alias")
            } catch (e: Exception) {
                Log.w(TAG, "StrongBox unavailable, falling back to standard TEE Keystore: ${e.message}")
            }
        }

        // Standard TEE fallback
        if (!keyStore.containsAlias(alias)) {
            val standardSpec = KeyGenParameterSpec.Builder(
                alias,
                KeyProperties.PURPOSE_SIGN or KeyProperties.PURPOSE_VERIFY
            )
                .setAlgorithmParameterSpec(ECGenParameterSpec(EC_CURVE_P256))
                .setDigests(KeyProperties.DIGEST_SHA256)
                .build()
            kpg.initialize(standardSpec)
            kpg.generateKeyPair()
            Log.i(TAG, "TEE Keystore key generated for alias: $alias")
        }

        return getKeyMetadata(alias) ?: throw IllegalStateException("Failed to inspect generated key for alias: $alias")
    }

    /**
     * Returns metadata and public key for the specified alias, or null if key does not exist.
     */
    fun getKeyMetadata(alias: String): KeyMetadata? {
        if (!keyStore.containsAlias(alias)) {
            return null
        }

        val certificate = keyStore.getCertificate(alias) ?: return null
        val publicKeyBytes = certificate.publicKey.encoded
        val publicKeyBase64 = Base64.encodeToString(publicKeyBytes, Base64.NO_WRAP)

        var isHardware = false
        var isStrongBox = false

        try {
            val privateKey = keyStore.getKey(alias, null) as? PrivateKey
            if (privateKey != null) {
                val factory = KeyFactory.getInstance(privateKey.algorithm, ANDROID_KEYSTORE)
                val keyInfo = factory.getKeySpec(privateKey, KeyInfo::class.java)

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    val securityLevel = keyInfo.securityLevel
                    isHardware = (securityLevel == KeyProperties.SECURITY_LEVEL_TRUSTED_ENVIRONMENT ||
                            securityLevel == KeyProperties.SECURITY_LEVEL_STRONGBOX)
                    isStrongBox = (securityLevel == KeyProperties.SECURITY_LEVEL_STRONGBOX)
                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    @Suppress("DEPRECATION")
                    isHardware = keyInfo.isInsideSecureHardware
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Could not determine hardware-backed status for alias: $alias (${e.message})")
        }

        return KeyMetadata(
            alias = alias,
            publicKey = publicKeyBase64,
            algorithm = "ECDSA_P256_SHA256",
            isHardwareBacked = isHardware,
            isStrongBoxBacked = isStrongBox
        )
    }

    /**
     * Signs a canonical payload string using the Keystore private key.
     * Output is standard DER-encoded ASN.1 signature in Base64 format.
     */
    fun signPayload(alias: String, payload: String): String {
        val privateKey = keyStore.getKey(alias, null) as? PrivateKey
            ?: throw IllegalArgumentException("No private key found in Android Keystore for alias: $alias")

        val signature = Signature.getInstance("SHA256withECDSA")
        signature.initSign(privateKey)
        signature.update(payload.toByteArray(Charsets.UTF_8))
        val derBytes = signature.sign()

        return Base64.encodeToString(derBytes, Base64.NO_WRAP)
    }

    /**
     * Checks if a key exists for the given alias.
     */
    fun hasKey(alias: String): Boolean {
        return keyStore.containsAlias(alias)
    }

    /**
     * Deletes a key from Android Keystore.
     */
    fun deleteKey(alias: String): Boolean {
        return if (keyStore.containsAlias(alias)) {
            keyStore.deleteEntry(alias)
            true
        } else {
            false
        }
    }
}
