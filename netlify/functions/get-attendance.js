const { google } = require('googleapis');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    console.log('🔵 Getting attendance...');

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.SPREADSHEET_ID;

    // Get all attendance records
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Attendance!A:H',
    });

    const rows = response.data.values || [];
    console.log(`Found ${rows.length} rows in Attendance sheet`);

    const records = {};

    // Skip header row if it exists
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row[0] && row[1] && row[3]) { // Date, StudentID, Period exist
        // Skip if first row looks like headers
        if (i === 0 && row[0].toLowerCase?.() === 'date') continue;
        
        const key = `${row[1]}_${row[0]}_${row[3]}`;
        records[key] = row[4]; // status
        records[key + '_faculty'] = row[5] || '';
        records[key + '_course'] = row[6] || '';
        records[key + '_studentName'] = row[2] || '';
        records[key + '_timestamp'] = row[7] || '';
      }
    }

    console.log(`Loaded ${Object.keys(records).filter(k => !k.includes('_')).length} attendance records`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ records })
    };

  } catch (error) {
    console.error('Get attendance error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message,
        records: {} 
      })
    };
  }
};