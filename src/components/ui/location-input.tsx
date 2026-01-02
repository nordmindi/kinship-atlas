import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { MapPin, Search } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface LocationInputProps {
  description: string;
  lat?: number;
  lng?: number;
  onLocationChange: (location: { description: string; lat?: number; lng?: number }) => void;
  descriptionLabel?: string;
  descriptionPlaceholder?: string;
  showCoordinates?: boolean;
  required?: boolean;
  className?: string;
}

const LocationInput: React.FC<LocationInputProps> = ({
  description: initialDescription,
  lat: initialLat,
  lng: initialLng,
  onLocationChange,
  descriptionLabel = "Location",
  descriptionPlaceholder = "e.g., New York City, NY, USA",
  showCoordinates: initialShowCoordinates = false,
  required = false,
  className = ""
}) => {
  const [description, setDescription] = useState(initialDescription || '');
  const [lat, setLat] = useState(initialLat?.toString() || '');
  const [lng, setLng] = useState(initialLng?.toString() || '');
  const [showCoordinates, setShowCoordinates] = useState(initialShowCoordinates || !!initialLat && !!initialLng);
  const [isGeocoding, setIsGeocoding] = useState(false);

  const handleDescriptionChange = (value: string) => {
    setDescription(value);
    onLocationChange({
      description: value,
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined
    });
  };

  const handleLatChange = (value: string) => {
    setLat(value);
    const numValue = value ? parseFloat(value) : undefined;
    onLocationChange({
      description,
      lat: numValue,
      lng: lng ? parseFloat(lng) : undefined
    });
  };

  const handleLngChange = (value: string) => {
    setLng(value);
    const numValue = value ? parseFloat(value) : undefined;
    onLocationChange({
      description,
      lat: lat ? parseFloat(lat) : undefined,
      lng: numValue
    });
  };

  const handleGeocode = async () => {
    if (!description.trim()) {
      return;
    }

    setIsGeocoding(true);
    try {
      // Use a free geocoding service (Nominatim from OpenStreetMap)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(description)}&limit=1`,
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
            description: description,
            lat: newLat,
            lng: newLng
          });
        }
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    } finally {
      setIsGeocoding(false);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="space-y-2">
        <Label htmlFor="location-description" className="text-sm font-medium">
          {descriptionLabel} {required && <span className="text-red-500">*</span>}
        </Label>
        <div className="flex gap-2">
          <Input
            id="location-description"
            placeholder={descriptionPlaceholder}
            value={description}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            className="flex-1"
            required={required}
          />
          {description && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGeocode}
              disabled={isGeocoding}
              title="Find coordinates for this location"
            >
              {isGeocoding ? (
                <Search className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
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

      {(description || lat || lng) && (
        <Alert>
          <MapPin className="h-4 w-4" />
          <AlertDescription className="text-xs">
            {description && <div>Location: {description}</div>}
            {lat && lng && (
              <div>
                Coordinates: {parseFloat(lat).toFixed(6)}, {parseFloat(lng).toFixed(6)}
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default LocationInput;

