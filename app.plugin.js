let configPlugins;
try {
  configPlugins = require('@expo/config-plugins');
} catch {
  configPlugins = require(require.resolve('@expo/config-plugins', { paths: [process.cwd()] }));
}
const { withPlugins, withAndroidManifest, createRunOncePlugin } = configPlugins;

const pkg = require('./package.json');

/**
 * Expo Config Plugin for expo-face-liveness.
 * Adds required Android permissions, hardware features, and camera config.
 */
function withFaceLivenessAndroid(config, props = {}) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const mainApplication = androidManifest.manifest.application?.[0];

    // Ensure permissions array exists
    if (!androidManifest.manifest['uses-permission']) {
      androidManifest.manifest['uses-permission'] = [];
    }

    const permissions = androidManifest.manifest['uses-permission'];
    const requiredPermissions = [
      'android.permission.CAMERA',
    ];

    for (const permission of requiredPermissions) {
      if (!permissions.some((p) => p.$?.['android:name'] === permission)) {
        permissions.push({
          $: { 'android:name': permission },
        });
      }
    }

    // Ensure uses-feature array exists
    if (!androidManifest.manifest['uses-feature']) {
      androidManifest.manifest['uses-feature'] = [];
    }

    const features = androidManifest.manifest['uses-feature'];
    const requiredFeatures = [
      { name: 'android.hardware.camera', required: 'false' },
      { name: 'android.hardware.camera.autofocus', required: 'false' },
      { name: 'android.hardware.camera.front', required: 'false' },
    ];

    for (const feat of requiredFeatures) {
      if (!features.some((f) => f.$?.['android:name'] === feat.name)) {
        features.push({
          $: {
            'android:name': feat.name,
            'android:required': feat.required,
          },
        });
      }
    }

    return config;
  });
}

function withFaceLiveness(config, props) {
  return withPlugins(config, [
    [withFaceLivenessAndroid, props],
  ]);
}

module.exports = createRunOncePlugin(withFaceLiveness, pkg.name, pkg.version);
