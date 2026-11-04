# Model Specification and Provenance

## Model Overview
- **Model Name:** MiniFASNetV2 (`2.7_80x80_MiniFASNetV2`)
- **Format:** TensorFlow Lite (`.tflite` / LiteRT)
- **File Name:** `silentface.tflite`
- **File Size:** 1,850,744 bytes (~1.85 MB)
- **SHA-256 Checksum:** `4ff758f470b757d9005b418c9978693f09b8f2a5e7b7ee848c160db21208e1b2`
- **Architecture:** Depthwise-separable convolutional neural network (pure CNN) designed for lightweight on-device Face Anti-Spoofing (FAS).

## Provenance & Attribution
- **Original Source & Architecture:** [minivision-ai/Silent-Face-Anti-Spoofing](https://github.com/minivision-ai/Silent-Face-Anti-Spoofing)
- **Authors / Organization:** Minivision AI
- **Upstream License:** Apache License 2.0 (Permits redistribution, modification, and commercial use with attribution).
- **LiteRT / TFLite Conversion:** Converted and validated by [litert-community/Silent-Face-Anti-Spoofing-LiteRT](https://huggingface.co/litert-community/Silent-Face-Anti-Spoofing-LiteRT) under the Apache License 2.0.

## Input Specification
- **Input Tensor Shape:** `[1, 3, 80, 80]` (Batch size = 1, Channels = 3, Height = 80, Width = 80; NCHW layout).
- **Color Channel Order:** **BGR** (Blue, Green, Red).
- **Data Type:** 32-bit floating point (`FLOAT32`).
- **Face Crop Region (Scale Margin):** The model requires a cropped patch scaled by **2.7×** relative to the detected face bounding box, centered on the face. This contextual margin includes the forehead, chin, and surrounding boundaries to capture presentation attack artifacts (such as photo paper edges, screen bezels, or digital moiré).
- **Pixel Normalization:** Scale raw 8-bit channel values `[0, 255]` to `[0.0, 1.0]` by dividing by `255.0f`:
  $$\text{pixel\_norm} = \frac{\text{pixel}}{255.0}$$

## Output Specification & Interpretation
- **Output Tensor Shape:** `[1, 3]` (Batch size = 1, Classes = 3).
- **Output Format:** Logits or Softmax probabilities `[p_0, p_1, p_2]`.
- **Class Meanings:**
  - **Index 0 (`class 0`):** Spoof / Fake (e.g. printed paper photo attack).
  - **Index 1 (`class 1`):** **Live / Real genuine face**.
  - **Index 2 (`class 2`):** Spoof / Fake (e.g. digital screen replay attack or mask).
- **Liveness Score:** The genuine face probability is given by index 1:
  $$\text{Live Score} = P(\text{class} = 1)$$
- **Classification Decision:**
  - $\text{argmax} = 1 \implies$ Candidate is classified as Live / Genuine.
  - $\text{argmax} \in \{0, 2\} \implies$ Candidate is classified as Presentation Attack (Spoof).

## Custom Model Support
If you wish to use a different or proprietary anti-spoofing model (e.g., trained on custom demographics or newer spoof vectors), you can provide a custom model file via the `modelPath` property in `FaceLivenessCamera` or pass a custom `ModelLoader` implementation. Ensure your custom model follows the configured input dimensions and normalization.
