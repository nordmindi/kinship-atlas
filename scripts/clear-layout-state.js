/**
 * Clear Layout State Script
 * 
 * Run this in your browser console to clear all layout state:
 * 
 * 1. Open your browser's Developer Tools (F12)
 * 2. Go to the Console tab
 * 3. Copy and paste this entire script
 * 4. Press Enter
 * 
 * This will clear all layout data from localStorage
 */

(function() {
  console.log('🧹 Clearing layout state...');
  
  // Clear layout state
  localStorage.removeItem('kinship-atlas-family-tree-layout');
  
  // Clear any other related localStorage data
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('kinship-atlas-')) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    console.log(`🗑️  Removed: ${key}`);
  });
  
  console.log('✅ Layout state cleared successfully!');
  console.log('🔄 Please refresh the page to see the changes.');
})();
