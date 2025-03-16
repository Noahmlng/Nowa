// Script to fetch and save data from the application running on port 3000
const fs = require('fs');
const path = require('path');
const http = require('http');

// Ensure the data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Function to fetch data from the application
async function fetchData() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/sync', // Assuming this endpoint returns the current state
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          resolve(parsedData);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });

    req.end();
  });
}

// Main function
async function main() {
  try {
    console.log('Fetching data from application...');
    const data = await fetchData();
    
    // Save the data to a file
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const filePath = path.join(dataDir, `model-data-${timestamp}.json`);
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`Data saved to ${filePath}`);
    
    // Also save to a fixed filename for easy access
    const latestFilePath = path.join(dataDir, 'latest-model-data.json');
    fs.writeFileSync(latestFilePath, JSON.stringify(data, null, 2));
    console.log(`Data also saved to ${latestFilePath}`);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run the main function
main(); 