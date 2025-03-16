// This script should be run in the browser console
// It will extract the data from localStorage and download it as a JSON file

function saveModelData() {
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
    
    // Create a Blob with the data
    const blob = new Blob([JSON.stringify(parsedData, null, 2)], { type: 'application/json' });
    
    // Create a download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `model-data-${new Date().toISOString().replace(/:/g, '-')}.json`;
    
    // Trigger the download
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
    
    console.log('Data download initiated');
  } catch (error) {
    console.error('Error saving model data:', error);
  }
}

// Run the function
saveModelData();

 