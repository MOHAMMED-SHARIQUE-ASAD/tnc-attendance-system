const { google } = require('googleapis');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { records } = JSON.parse(event.body);
    
    if (!records || !Array.isArray(records)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid records data' })
      };
    }

    // Initialize Google Sheets API
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.SPREADSHEET_ID;

    // Prepare values for insertion
    const timestamp = new Date().toISOString();
    const values = records.map(record => [
      record.date,
      record.studentId,
      record.studentName,
      record.period.toString(),
      record.status,
      record.faculty,
      record.course,
      timestamp
    ]);

    // Append to Attendance sheet
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Attendance!A:H',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values }
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: `Saved ${records.length} attendance records`,
        updatedRange: response.data.updates?.updatedRange
      })
    };

  } catch (error) {
    console.error('Save attendance error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message,
        details: error.toString()
      })
    };
  }
};