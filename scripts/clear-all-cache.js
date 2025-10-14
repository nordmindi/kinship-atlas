console.log('🧹 Clearing ALL browser cache and storage...');

// Clear localStorage
console.log('Clearing localStorage...');
localStorage.clear();

// Clear sessionStorage
console.log('Clearing sessionStorage...');
sessionStorage.clear();

// Clear specific React Flow keys
const reactFlowKeys = [
  'reactFlowNodes',
  'reactFlowEdges', 
  'reactFlowViewport',
  'kinship-atlas-layout',
  'family-tree-layout',
  'tree-layout-state'
];

reactFlowKeys.forEach(key => {
  if (localStorage.getItem(key)) {
    localStorage.removeItem(key);
    console.log(`Removed localStorage item: ${key}`);
  }
  if (sessionStorage.getItem(key)) {
    sessionStorage.removeItem(key);
    console.log(`Removed sessionStorage item: ${key}`);
  }
});

// Clear any cached data
const cacheKeys = Object.keys(localStorage);
cacheKeys.forEach(key => {
  if (key.includes('cache') || key.includes('tree') || key.includes('family') || key.includes('layout')) {
    localStorage.removeItem(key);
    console.log(`Removed cached item: ${key}`);
  }
});

console.log('✅ All browser cache cleared! Please refresh the page.');
console.log('🔄 If you still see intermediate nodes, try:');
console.log('   1. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)');
console.log('   2. Open in incognito/private mode');
console.log('   3. Clear browser cache manually');
