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
    console.log('🔵 Function triggered');
    console.log('Event body:', event.body);

    const { records } = JSON.parse(event.body);
    console.log('Records to save:', records?.length);

    if (!records || !Array.isArray(records)) {
      console.error('❌ Invalid records data');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid records data' })
      };
    }

    // Check environment variables
    console.log('Checking env vars...');
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
      console.error('❌ Missing GOOGLE_SERVICE_ACCOUNT_EMAIL');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Missing service account email' })
      };
    }
    if (!process.env.GOOGLE_PRIVATE_KEY) {
      console.error('❌ Missing GOOGLE_PRIVATE_KEY');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Missing private key' })
      };
    }
    if (!process.env.SPREADSHEET_ID) {
      console.error('❌ Missing SPREADSHEET_ID');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Missing spreadsheet ID' })
      };
    }

    console.log('✅ Environment variables present');

    // Initialize Google Sheets API
    console.log('Initializing Google Auth...');
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.SPREADSHEET_ID;

    // First, check if we can access the sheet
    console.log('Testing sheet access...');
    try {
      const testResponse = await sheets.spreadsheets.get({
        spreadsheetId
      });
      console.log('✅ Sheet access successful:', testResponse.data.properties.title);
    } catch (testError) {
      console.error('❌ Cannot access sheet:', testError.message);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Cannot access Google Sheet',
          details: 'Make sure sheet is shared with service account'
        })
      };
    }

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

    console.log('Appending to sheet:', values.length, 'rows');
    console.log('First row sample:', values[0]);

    // Append to Attendance sheet
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Attendance!A:H',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values }
    });

    console.log('✅ Save successful:', response.data);

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
    console.error('❌ Fatal error:', error);
    console.error('Error stack:', error.stack);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message,
        stack: error.stack
      })
    };
  }
};