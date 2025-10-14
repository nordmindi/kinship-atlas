// Run this in the browser console to clear all cached tree layout data

// Clear all localStorage keys related to family tree layout
const keysToRemove = [];
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key && (key.includes('family-tree') || key.includes('tree-layout') || key.includes('reactflow'))) {
    keysToRemove.push(key);
  }
}

console.log('🧹 Clearing cached tree layout data...');
console.log(`Found ${keysToRemove.length} cached keys:`, keysToRemove);

keysToRemove.forEach(key => {
  localStorage.removeItem(key);
  console.log(`✅ Removed: ${key}`);
});

console.log('🎉 Cache cleared! Please refresh the page.');

