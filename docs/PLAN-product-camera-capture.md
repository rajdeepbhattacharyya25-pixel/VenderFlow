# PLAN: Product Camera Capture Service

## 🎯 Goal
Implement a premium, integrated "Live Camera" capture service in the Seller Dashboard. This allows sellers to snap product photos directly within the browser, ensuring a 1:1 square aspect ratio for marketplace consistency, and processing them through the existing image editor and upload pipeline.

## 🏗️ Architecture
- **New Component:** `LiveCameraModal.tsx`
  - Uses `MediaDevices.getUserMedia()` to stream the camera feed.
  - Features a glassmorphic overlay with a 1:1 square guide frame.
  - Includes a "Snap" action that draws the video frame to a hidden canvas.
- **Workflow Integration:**
  - **ProductModal.tsx**: Add "Take Photo" button next to "Choose Image".
  - **LiveCameraModal**: Captures the raw frame and returns a Blob/DataURL.
  - **ImageEditorModal.tsx**: Receives the captured frame for user adjustments.
  - **unifiedUpload / compressImage**: Handles the final storage and DB persistence.

## 📝 Task Breakdown

### Phase 1: Foundation & UI Logic
1. **Create `LiveCameraModal.tsx`** in `dashboard/components/products/`.
   - Setup basic modal structure with Framer Motion for premium transitions.
   - Implement `MediaDevices` API logic to request permission and start/stop the video stream.
   - Handle permission-rejection states with a "Minimal yet premium" message.
2. **Design the Camera UI Overlay:**
   - Add a centralized 1:1 square frame (semi-transparent mask around the edges).
   - Implement "Live Grid Overlay" (3x3 grid) to help with product alignment.
   - Add a large, centered "Snap" button with a modern hover/active state.
   - Add "Retake" and "Close" controls.

### Phase 2: Capture & Processing
1. **Implement Frame Capture:**
   - Use a `canvas` element to crop the 1:1 square area from the video stream.
   - Convert the canvas content to a File/Blob.
2. **Integrate with `ProductModal.tsx`:**
   - Add the camera icon button next to the file upload button.
   - Implement the handler to open `LiveCameraModal`.
3. **Connect to Editor:**
   - On "Snap", close the camera modal and immediately open `ImageEditorModal` with the captured image.
   - Ensure the image passes through the existing `compressImage` flow after editing.

### Phase 3: Premium Polish & Testing
1. **Add Haptic Feedback:** Trigger a small `window.navigator.vibrate` (if available on mobile) upon successful capture.
2. **Optimize Load/Unload:** Ensure the camera track is correctly stopped when the modal is closed to preserve battery and privacy.
3. **UX Refinement:** Add a soft shimmer/scanning animation when the camera is initializing.

## ✅ Verification Checklist

### ⚙️ Functional Tests
- [ ] Camera permission prompt appears on "Take Photo".
- [ ] Live stream displays with a 1:1 square guide frame.
- [ ] Grid overlay can be toggled or is visible by default.
- [ ] "Snap" captures the correct square area.
- [ ] Captured photo opens correctly in `ImageEditorModal`.

### 📱 Responsive & Compatibility
- [ ] Test on Android/iOS mobile browsers (front and back camera if possible).
- [ ] Test on Desktop Chrome/Safari webcams.
- [ ] Verify haptic feedback works on compatible mobile devices.

### 🛡️ Edge Cases
- [ ] Gracefully handle "Permission Denied" scenario with a user-friendly UI.
- [ ] Verify camera track is terminated when the user closes the modal without snapping.
- [ ] Ensure multiple snaps don't leak camera instances.

## 👥 Assignees
- **Frontend Specialist**: `LiveCameraModal.tsx` and UI/UX integration.
- **Project Planner**: Overseeing flow logic between modals.
