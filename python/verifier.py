import base64
import struct
import urllib.parse
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import hashes
from cryptography.exceptions import InvalidSignature

def serialize_canonical_proof(proof: dict) -> str:
    """Matches serializeCanonicalProofPayload in Protocol v2.0."""
    def escape(v):
        if v is None:
            return "null"
        return urllib.parse.quote(str(v), safe="")

    parts = [
        f"v={proof.get('protocolVersion', '2.0')}",
        f"pid={escape(proof.get('proofId'))}",
        f"sid={escape(proof.get('sessionId'))}",
        f"did={escape(proof.get('deviceId'))}",
        f"uid={escape(proof.get('userId'))}",
        f"iat={escape(proof.get('issuedAt'))}",
        f"exp={escape(proof.get('expiresAt'))}",
        f"nonce={escape(proof.get('nonce'))}",
        f"ls={float(proof.get('livenessScore', 0)):.4f}",
        f"ps={float(proof.get('passiveScore', 0)):.4f}",
        f"rs={f'{float(proof.get(\"recognitionScore\")):.4f}' if proof.get('recognitionScore') is not None else 'null'}",
        f"match={'true' if proof.get('isMatch') is True else 'false' if proof.get('isMatch') is False else 'null'}",
        f"ctype={escape(proof.get('challengeType'))}",
        f"cres={'true' if proof.get('challengeResult') else 'false'}",
        f"dur={round(float(proof.get('durationMs', 0)))}",
        f"model={escape(proof.get('modelVersion'))}",
        f"alg={escape(proof.get('signatureAlgorithm'))}",
    ]
    return "&".join(parts)

def verify_biometric_proof(proof: dict, public_key_pem_or_b64: str) -> bool:
    """Verifies ECDSA P-256 signatures produced by Android Keystore."""
    try:
        canonical_str = serialize_canonical_proof(proof)
        sig_bytes = base64.b64decode(proof["signature"])
        if "BEGIN PUBLIC KEY" in public_key_pem_or_b64:
            from cryptography.hazmat.primitives.serialization import load_pem_public_key
            pub_key = load_pem_public_key(public_key_pem_or_b64.encode("utf-8"))
        else:
            raw_bytes = base64.b64decode(public_key_pem_or_b64)
            if len(raw_bytes) == 65 and raw_bytes[0] == 0x04:
                pub_key = ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256R1(), raw_bytes)
            else:
                from cryptography.hazmat.primitives.serialization import load_der_public_key
                pub_key = load_der_public_key(raw_bytes)
        pub_key.verify(sig_bytes, canonical_str.encode("utf-8"), ec.ECDSA(hashes.SHA256()))
        return True
    except (InvalidSignature, Exception):
        return False

def unpack_face_embedding(base64_str: str) -> list[float]:
    raw = base64.b64decode(base64_str)
    if len(raw) != 768:
        raise ValueError(f"Expected 768 bytes (192 floats), got {len(raw)}")
    return list(struct.unpack("<192f", raw))
