/**
 * ==============================================================================
 * THAISAR — Thai Language School
 * Google Apps Script for Google Drive Payment Screenshot Uploads
 * ==============================================================================
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open Google Drive (drive.google.com).
 * 2. Create a folder where you want to store payment screenshots (e.g. "THAISAR_Payment_Slips").
 * 3. Open that folder and copy the Folder ID from the browser URL:
 *    https://drive.google.com/drive/folders/1abcXYZ_EXAMPLE_FOLDER_ID
 *    (Paste your folder ID into DEFAULT_FOLDER_ID below or pass it from your app).
 * 4. Go to script.google.com -> Click "+ New project".
 * 5. Replace all code in "Code.gs" with this entire script.
 * 6. Click "Deploy" (top right button) -> "New deployment".
 * 7. Click gear icon (Select type) -> choose "Web app".
 * 8. Set settings:
 *    - Description: "THAISAR Payment Screenshot Upload API"
 *    - Execute as: "Me" (your Google account)
 *    - Who has access: "Anyone"  <-- CRITICAL! Must be "Anyone" so student uploads work without Google login!
 * 9. Click "Deploy" -> Review Permissions -> Advanced -> Go to ... (unsafe) -> Allow.
 * 10. Copy the Web App URL (starts with https://script.google.com/macros/s/.../exec).
 * 11. In your app's .env file or Settings modal, set:
 *     VITE_GOOGLE_DRIVE_UPLOAD_URL="https://script.google.com/macros/s/.../exec"
 *     VITE_GOOGLE_DRIVE_FOLDER_ID="your_folder_id_here"
 * ==============================================================================
 */

// Replace with your Google Drive Folder ID (optional fallback if not sent in request)
var DEFAULT_FOLDER_ID = "YOUR_GOOGLE_DRIVE_FOLDER_ID_HERE";

/**
 * Handles GET requests (for testing and connectivity verification)
 */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    service: "THAISAR Google Drive Upload API",
    timestamp: new Date().toISOString(),
    message: "Web App endpoint is active and ready to receive POST image uploads."
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handles POST requests containing base64 screenshot data
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "No POST body received."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      // Fallback for form-urlencoded or parameter parsing
      data = e.parameter || {};
    }

    var base64String = data.base64 || data.image || data.file;
    if (!base64String) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "Missing 'base64' image data in request payload."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Clean base64 header if present (e.g. data:image/png;base64,...)
    var cleanBase64 = base64String.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, "");
    
    // Determine MIME type and file extension
    var mimeType = data.mimeType || "image/jpeg";
    var ext = "jpg";
    if (mimeType.indexOf("png") !== -1) {
      ext = "png";
    } else if (mimeType.indexOf("webp") !== -1) {
      ext = "webp";
    }

    // Determine file name
    var orderId = data.orderId || ("ORD-" + new Date().getTime());
    var customerName = (data.customerName || "Customer").replace(/[\/\\?%*:|"<>]/g, "_");
    var customerPhone = data.customerPhone || "";
    var timestamp = Utilities.formatDate(new Date(), "GMT+6:30", "yyyyMMdd-HHmmss");
    
    var fileName = data.fileName || ("Slip_" + orderId + "_" + customerName + "_" + timestamp + "." + ext);

    // Target folder
    var folderId = data.folderId || DEFAULT_FOLDER_ID;
    var targetFolder;
    try {
      if (folderId && folderId !== "YOUR_GOOGLE_DRIVE_FOLDER_ID_HERE") {
        targetFolder = DriveApp.getFolderById(folderId);
      } else {
        targetFolder = DriveApp.getRootFolder();
      }
    } catch (folderErr) {
      // Fallback to root folder if folder ID not found or permission issue
      targetFolder = DriveApp.getRootFolder();
    }

    // Decode base64 to Blob
    var decodedBytes = Utilities.base64Decode(cleanBase64);
    var blob = Utilities.newBlob(decodedBytes, mimeType, fileName);

    // Create file in the specified Drive folder
    var driveFile = targetFolder.createFile(blob);
    
    // Add descriptive metadata
    var description = "THAISAR Payment Screenshot\n" +
                      "Order ID: " + orderId + "\n" +
                      "Customer: " + customerName + "\n" +
                      "Phone: " + customerPhone + "\n" +
                      "Uploaded At: " + new Date().toISOString();
    driveFile.setDescription(description);

    // Make viewable by anyone with link so admin & student can preview
    try {
      driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (sharingErr) {
      // Ignore sharing error if domain restricted
    }

    var fileId = driveFile.getId();
    var fileUrl = driveFile.getUrl();
    var downloadUrl = driveFile.getDownloadUrl();

    // Return success response
    var response = {
      status: "success",
      fileId: fileId,
      fileUrl: fileUrl,
      downloadUrl: downloadUrl,
      fileName: fileName,
      orderId: orderId,
      folderName: targetFolder.getName(),
      message: "Payment screenshot saved successfully to Google Drive."
    };

    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    var errorResponse = {
      status: "error",
      message: err.toString()
    };
    return ContentService.createTextOutput(JSON.stringify(errorResponse))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
