import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, X, Search } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface LocationPickerProps {
  location?: string;
  lat?: number;
  lng?: number;
  onLocationChange: (location: { location?: string; lat?: number; lng?: number }) => void;
}

const LocationPicker: React.FC<LocationPickerProps> = ({
  location: initialLocation,
  lat: initialLat,
  lng: initialLng,
  onLocationChange
}) => {
  const [location, setLocation] = useState(initialLocation || '');
  const [lat, setLat] = useState(initialLat?.toString() || '');
  const [lng, setLng] = useState(initialLng?.toString() || '');
  const [showCoordinates, setShowCoordinates] = useState(!!initialLat && !!initialLng);

  const handleLocationChange = (value: string) => {
    setLocation(value);
    onLocationChange({
      location: value || undefined,
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined
    });
  };

  const handleLatChange = (value: string) => {
    setLat(value);
    const numValue = value ? parseFloat(value) : undefined;
    onLocationChange({
      location: location || undefined,
      lat: numValue,
      lng: lng ? parseFloat(lng) : undefined
    });
  };

  const handleLngChange = (value: string) => {
    setLng(value);
    const numValue = value ? parseFloat(value) : undefined;
    onLocationChange({
      location: location || undefined,
      lat: lat ? parseFloat(lat) : undefined,
      lng: numValue
    });
  };

  const handleClear = () => {
    setLocation('');
    setLat('');
    setLng('');
    setShowCoordinates(false);
    onLocationChange({});
  };

  const handleGeocode = async () => {
    if (!location.trim()) {
      return;
    }

    try {
      // Use a free geocoding service (Nominatim from OpenStreetMap)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`,
        {
          headers: {
            'User-Agent': 'KinshipAtlas/1.0'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.length > 0) {
          const result = data[0];
          const newLat = parseFloat(result.lat);
          const newLng = parseFloat(result.lon);
          setLat(newLat.toString());
          setLng(newLng.toString());
          setShowCoordinates(true);
          onLocationChange({
            location: location || undefined,
            lat: newLat,
            lng: newLng
          });
        }
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-gray-600" />
            <Label className="text-sm font-medium">Story Location (Optional)</Label>
          </div>
          {(location || lat || lng) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-6 px-2"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="location-text" className="text-xs text-gray-600">
              Location Name
            </Label>
            <div className="flex gap-2">
              <Input
                id="location-text"
                placeholder="e.g., Ellis Island, New York, USA"
                value={location}
                onChange={(e) => handleLocationChange(e.target.value)}
                className="flex-1"
              />
              {location && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGeocode}
                  title="Find coordinates for this location"
                >
                  <Search className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowCoordinates(!showCoordinates)}
              className="text-xs"
            >
              {showCoordinates ? 'Hide' : 'Add'} Coordinates
            </Button>
            {showCoordinates && (
              <span className="text-xs text-gray-500">
                (Optional - for map display)
              </span>
            )}
          </div>

          {showCoordinates && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="lat" className="text-xs text-gray-600">
                  Latitude
                </Label>
                <Input
                  id="lat"
                  type="number"
                  step="any"
                  placeholder="40.7128"
                  value={lat}
                  onChange={(e) => handleLatChange(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lng" className="text-xs text-gray-600">
                  Longitude
                </Label>
                <Input
                  id="lng"
                  type="number"
                  step="any"
                  placeholder="-74.0060"
                  value={lng}
                  onChange={(e) => handleLngChange(e.target.value)}
                />
              </div>
            </div>
          )}

          {(location || lat || lng) && (
            <Alert>
              <MapPin className="h-4 w-4" />
              <AlertDescription className="text-xs">
                {location && <div>Location: {location}</div>}
                {lat && lng && (
                  <div>
                    Coordinates: {parseFloat(lat).toFixed(6)}, {parseFloat(lng).toFixed(6)}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default LocationPicker;

