# Mapbox Token Setup Guide

## **🔧 QUICK FIX FOR MAP UNAVAILABLE ERROR**

The "Map Unavailable" error is caused by an expired or invalid Mapbox token. Here's how to fix it:

---

## **📋 STEP-BY-STEP SOLUTION**

### **1. Get a Free Mapbox Token**
1. Go to [https://account.mapbox.com/access-tokens/](https://account.mapbox.com/access-tokens/)
2. Sign up for a free account (if you don't have one)
3. Create a new access token
4. Copy the token (it starts with `pk.`)

### **2. Add Token to Your Environment**
1. Create a `.env.local` file in your project root (if it doesn't exist)
2. Add this line to the file:
   ```
   VITE_MAPBOX_TOKEN=your_actual_token_here
   ```
3. Replace `your_actual_token_here` with the token you copied

### **3. Restart Your Development Server**
```bash
npm run dev
# or
yarn dev
```

---

## **🎯 EXAMPLE .env.local FILE**

```bash
# Supabase Configuration
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0

# Mapbox Token for Family Map
VITE_MAPBOX_TOKEN=pk.eyJ1IjoieW91cnVzZXJuYW1lIiwiYSI6ImNsZXhhbXBsZSJ9.your_actual_token_here
```

---

## **✅ VERIFICATION**

After setting up the token:
1. Go to the Family Map page
2. The map should load successfully
3. You should see the interactive world map
4. Family members with location data will appear as markers

---

## **🔒 SECURITY NOTES**

- **Never commit your `.env.local` file** to version control
- **The `.env.local` file is already in `.gitignore`**
- **Mapbox tokens are free for development use**
- **Each token has usage limits, but they're generous for personal projects**

---

## **🚨 TROUBLESHOOTING**

### **If the map still doesn't work:**
1. **Check the browser console** for error messages
2. **Verify the token format** (should start with `pk.`)
3. **Make sure you restarted the dev server** after adding the token
4. **Check that the `.env.local` file is in the project root**

### **If you get rate limit errors:**
- The free Mapbox tier has generous limits
- If you hit limits, wait a few minutes and try again
- Consider upgrading to a paid plan for production use

---

## **🎉 RESULT**

Once configured, your Family Map will show:
- ✅ Interactive world map
- ✅ Family member markers with location data
- ✅ Search and filtering capabilities
- ✅ Statistics dashboard
- ✅ All the enhanced features we implemented

**The map will work perfectly with your family member location data!** 🌍✨
