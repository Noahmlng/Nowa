// This script should be run in the browser console
// It will extract the data from localStorage and send it to the server to be saved

async function saveModelDataToServer() {
  try {
    // Get the data from localStorage
    const storageKey = 'nowa-storage';
    const storedData = localStorage.getItem(storageKey);
    
    if (!storedData) {
      console.error('No data found in localStorage with key:', storageKey);
      return;
    }
    
    // Parse the data
    const parsedData = JSON.parse(storedData);
    console.log('Data retrieved from localStorage:', parsedData);
    
    // Send the data to the server
    const response = await fetch('/api/save-model-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(parsedData)
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('Data saved successfully on the server:', result);
    } else {
      console.error('Failed to save data on the server:', result.message);
    }
  } catch (error) {
    console.error('Error saving model data to server:', error);
  }
}

// Run the function
saveModelDataToServer(); 