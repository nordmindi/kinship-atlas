#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupEnvironment() {
  console.log('🔧 Kinship Atlas Environment Setup\n');
  
  const envPath = '.env.local';
  const envExists = fs.existsSync(envPath);
  
  if (envExists) {
    console.log('✅ .env.local file already exists');
    const overwrite = await question('Do you want to add/update the Mapbox token? (y/n): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('Setup cancelled.');
      rl.close();
      return;
    }
  }
  
  console.log('\n📋 Setting up environment variables...\n');
  
  // Read existing .env.local if it exists
  let envContent = '';
  if (envExists) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }
  
  // Check if Mapbox token already exists
  const hasMapboxToken = envContent.includes('VITE_MAPBOX_TOKEN');
  
  if (hasMapboxToken) {
    console.log('✅ Mapbox token already configured in .env.local');
    const update = await question('Do you want to update it? (y/n): ');
    if (update.toLowerCase() !== 'y') {
      console.log('Setup complete.');
      rl.close();
      return;
    }
  }
  
  console.log('🗺️  Mapbox Token Setup');
  console.log('1. Go to: https://account.mapbox.com/access-tokens/');
  console.log('2. Sign up for a free account (if needed)');
  console.log('3. Create a new access token');
  console.log('4. Copy the token (starts with "pk.")\n');
  
  const mapboxToken = await question('Enter your Mapbox token: ');
  
  if (!mapboxToken.trim()) {
    console.log('❌ No token provided. Setup cancelled.');
    rl.close();
    return;
  }
  
  if (!mapboxToken.startsWith('pk.')) {
    console.log('⚠️  Warning: Mapbox tokens usually start with "pk."');
    const proceed = await question('Continue anyway? (y/n): ');
    if (proceed.toLowerCase() !== 'y') {
      console.log('Setup cancelled.');
      rl.close();
      return;
    }
  }
  
  // Prepare environment content
  let newEnvContent = envContent;
  
  // Remove existing Mapbox token line if it exists
  newEnvContent = newEnvContent.replace(/^VITE_MAPBOX_TOKEN=.*$/m, '');
  
  // Add Supabase configuration if not present
  if (!newEnvContent.includes('VITE_SUPABASE_URL')) {
    newEnvContent += '\n# Supabase Configuration\n';
    newEnvContent += 'VITE_SUPABASE_URL=http://localhost:60001\n';
    newEnvContent += 'VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0\n';
  }
  
  // Add Mapbox token
  newEnvContent += '\n# Mapbox Token for Family Map\n';
  newEnvContent += `VITE_MAPBOX_TOKEN=${mapboxToken.trim()}\n`;
  
  // Clean up extra newlines
  newEnvContent = newEnvContent.replace(/\n{3,}/g, '\n\n');
  
  // Write the file
  fs.writeFileSync(envPath, newEnvContent);
  
  console.log('\n✅ Environment setup complete!');
  console.log(`📁 Created/updated: ${path.resolve(envPath)}`);
  console.log('\n🚀 Next steps:');
  console.log('1. Restart your development server (npm run dev)');
  console.log('2. Go to the Family Map page');
  console.log('3. The map should now load successfully!');
  console.log('\n🎉 Your Family Map is ready to use!');
  
  rl.close();
}

setupEnvironment().catch(console.error);
