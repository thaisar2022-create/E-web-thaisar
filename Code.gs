/**
 * ==============================================================================
 * THAISAR — Thai Language School
 * Google Apps Script Backend (Code.gs)
 * Automatically records orders to Google Sheet & saves screenshots to Google Drive
 * ==============================================================================
 * 
 * QUICK SETUP GUIDE:
 * ------------------------------------------------------------------------------
 * 1. Open Google Sheets (sheets.google.com) and create a new Spreadsheet:
 *    - Name it: "THAISAR_Student_Orders"
 *    - Copy the SPREADSHEET_ID from the browser URL:
 *      https://docs.google.com/spreadsheets/d/1AbC...XYZ_YOUR_SHEET_ID/edit
 *    - Paste it into SPREADSHEET_ID below.
 * 
 * 2. Open Google Drive (drive.google.com) and create a folder for slips:
 *    - Name it: "THAISAR_Payment_Slips"
 *    - Open folder and copy the DRIVE_FOLDER_ID from the browser URL:
 *      https://drive.google.com/drive/folders/1AbC...XYZ_YOUR_FOLDER_ID
 *    - Paste it into DRIVE_FOLDER_ID below.
 * 
 * 3. In your Google Sheet, click:
 *    Extensions (တိုးချဲ့ချက်များ) -> Apps Script
 *    - Delete any existing code in Code.gs.
 *    - Paste this entire file contents into Code.gs.
 * 
 * 4. Click "Deploy" (အပေါ်ညာဘက်ခလုတ်) -> "New deployment" (ဖြန့်ကျက်မှုအသစ်):
 *    - Click gear icon next to "Select type" -> Select "Web app".
 *    - Description: "THAISAR Order & Slip API"
 *    - Execute as: "Me" (သင့်အကောင့်)
 *    - Who has access: "Anyone" (မည်သူမဆို - အရေးကြီးပါသည်! Login မလိုဘဲပို့နိုင်ရန်)
 * 
 * 5. Click "Deploy" -> Review Permissions -> Advanced -> Go to ... (unsafe) -> Allow.
 * 
 * 6. Copy the generated Web App URL:
 *    (e.g. https://script.google.com/macros/s/AKfycb.../exec)
 * 
 * 7. In your app's .env file or Settings modal, paste:
 *    VITE_GOOGLE_APPS_SCRIPT_URL="https://script.google.com/macros/s/AKfycb.../exec"
 *    VITE_GOOGLE_DRIVE_FOLDER_ID="your_folder_id"
 * ==============================================================================
 */

// 1. CONFIGURATION PLACEHOLDERS
var SPREADSHEET_ID = "YOUR_SPREADSHEET_ID_HERE";       // e.g. "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
var SHEET_NAME = "Orders";                             // e.g. "Orders" or "သင်တန်းအပ်နှံမှုများ"
var DRIVE_FOLDER_ID = "YOUR_GOOGLE_DRIVE_FOLDER_ID_HERE"; // e.g. "1a2b3c4d5e6f7g8h9i0j"

/**
 * Handles GET requests (Verification & Health Check)
 */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    service: "THAISAR Order & Google Drive Slip API",
    timestamp: new Date().toISOString(),
    spreadsheetConfigured: SPREADSHEET_ID !== "YOUR_SPREADSHEET_ID_HERE",
    driveFolderConfigured: DRIVE_FOLDER_ID !== "YOUR_GOOGLE_DRIVE_FOLDER_ID_HERE",
    message: "Web App endpoint is active and ready to receive POST order & slip submissions."
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handles POST requests containing order payload and payment screenshot
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
      data = e.parameter || {};
    }

    // 1. Extract Order & Customer Fields
    var timestamp = data.timestamp || new Date().toISOString();
    var customerName = data.customerName || data.name || "Customer";
    var phone = data.phone || data.customerPhone || "";
    var deliveryAddress = data.deliveryAddress || data.address || "";
    var courseOrProduct = data.courseOrProduct || data.label || data.course || "Course";
    var paymentMethod = data.paymentMethod || data.payment || "KBZPay";
    var amount = data.amount || (data.total ? (data.total + " MMK") : "-");
    var orderId = data.orderId || ("THS-" + Utilities.formatDate(new Date(), "GMT+6:30", "yyMMddHHmmss"));

    // 2. Extract Base64 Image (Optional for Cash on Delivery)
    var rawBase64 = data.fileBase64 || data.base64 || data.image || data.file || "";
    var base64String = (typeof rawBase64 === "string" && rawBase64.trim() !== "" && rawBase64 !== "null") ? rawBase64 : "";
    var fileName = data.fileName || ("Slip_" + orderId + "_" + customerName.replace(/[^a-zA-Z0-9_-]/g, "_") + ".jpg");
    var mimeType = data.fileMimeType || data.mimeType || "image/jpeg";
    var folderId = data.folderId || DRIVE_FOLDER_ID;

    var fileUrl = "";
    var fileId = "";

    // 3. Save Screenshot to Google Drive (if provided)
    if (base64String && base64String.length > 50) {
      try {
        var cleanBase64 = base64String.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, "");
        
        var targetFolder;
        try {
          if (folderId && folderId !== "YOUR_GOOGLE_DRIVE_FOLDER_ID_HERE") {
            targetFolder = DriveApp.getFolderById(folderId);
          } else {
            targetFolder = DriveApp.getRootFolder();
          }
        } catch (errFolder) {
          targetFolder = DriveApp.getRootFolder();
        }

        var decodedBytes = Utilities.base64Decode(cleanBase64);
        var blob = Utilities.newBlob(decodedBytes, mimeType, fileName);
        var driveFile = targetFolder.createFile(blob);

        // Metadata description
        driveFile.setDescription(
          "THAISAR Student Payment Slip\n" +
          "Order ID: " + orderId + "\n" +
          "Customer: " + customerName + "\n" +
          "Phone: " + phone + "\n" +
          (deliveryAddress ? ("Address: " + deliveryAddress + "\n") : "") +
          "Course/Item: " + courseOrProduct + "\n" +
          "Payment Method: " + paymentMethod + "\n" +
          "Amount: " + amount + "\n" +
          "Date: " + timestamp
        );

        // Set sharing so admin and student can view
        try {
          driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        } catch (shareErr) {
          // Continue if domain restricts public sharing
        }

        fileId = driveFile.getId();
        fileUrl = driveFile.getUrl();
      } catch (driveErr) {
        Logger.log("Drive file creation notice: " + driveErr.toString());
      }
    }

    // 4. Record to Google Sheet
    var targetSpreadsheetId = data.spreadsheetId || SPREADSHEET_ID;
    var targetSheetName = data.sheetName || SHEET_NAME;
    var sheetRecorded = false;

    if (targetSpreadsheetId && targetSpreadsheetId !== "YOUR_SPREADSHEET_ID_HERE") {
      try {
        var ss = SpreadsheetApp.openById(targetSpreadsheetId);
        var sheet = ss.getSheetByName(targetSheetName);

        if (!sheet) {
          sheet = ss.insertSheet(targetSheetName);
        }

        // Add headers if sheet is newly created or empty
        if (sheet.getLastRow() === 0) {
          var headers = [
            "Date/Time",
            "Order ID",
            "Customer Name",
            "Phone",
            "Delivery Address",
            "Course / Product",
            "Payment Method",
            "Amount",
            "Screenshot Link",
            "Status"
          ];
          sheet.appendRow(headers);

          // Style header row
          var headerRange = sheet.getRange(1, 1, 1, headers.length);
          headerRange.setBackground("#4F46E5");
          headerRange.setFontColor("#FFFFFF");
          headerRange.setFontWeight("bold");
          sheet.setFrozenRows(1);
        }

        // Format Date nicely in Myanmar Time (GMT+6:30)
        var formattedDate = Utilities.formatDate(new Date(), "GMT+6:30", "yyyy-MM-dd HH:mm:ss");

        // Format hyperlink formula if file URL exists
        var linkCell = fileUrl
          ? '=HYPERLINK("' + fileUrl + '", "View Slip")'
          : (paymentMethod === "Cash on Delivery" ? "Cash on Delivery (No Slip)" : "No Slip");

        var colCount = sheet.getLastColumn();
        var newRow;
        if (colCount >= 10 || sheet.getLastRow() === 1) {
          newRow = [
            formattedDate,
            orderId,
            customerName,
            phone,
            deliveryAddress || "-",
            courseOrProduct,
            paymentMethod,
            amount,
            linkCell,
            "Pending Verification"
          ];
        } else {
          newRow = [
            formattedDate,
            orderId,
            customerName + (deliveryAddress ? " (" + deliveryAddress + ")" : ""),
            phone,
            courseOrProduct,
            paymentMethod,
            amount,
            linkCell,
            "Pending Verification"
          ];
        }

        sheet.appendRow(newRow);
        sheetRecorded = true;
      } catch (sheetErr) {
        Logger.log("Sheet record error: " + sheetErr.toString());
      }
    }

    // 5. Response JSON
    var response = {
      status: "success",
      message: "Order recorded successfully",
      orderId: orderId,
      fileUrl: fileUrl,
      fileId: fileId,
      sheetRecorded: sheetRecorded
    };

    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (globalErr) {
    var errorResponse = {
      status: "error",
      message: globalErr.toString()
    };
    return ContentService.createTextOutput(JSON.stringify(errorResponse))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
