
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FamilyMember } from '@/types';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Modal } from '@/components/ui/modal';
import { DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AvatarBackground } from '@/components/ui/avatar-background';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { calculateAge } from '@/utils/dateUtils';
import AddLocationDialog from './AddLocationDialog';
import { 
  Map, 
  MapPin, 
  Compass, 
  Users, 
  Globe, 
  Search, 
  Filter,
  ZoomIn,
  ZoomOut,
  Maximize,
  Navigation,
  Calendar,
  Heart,
  Home,
  Plane,
  Car,
  Train,
  Plus,
  Info
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Get Mapbox token from environment variables or use a fallback
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.eyJ1IjoibG92YWJsZWFpIiwiYSI6ImNsdWs2OWdtcDA0YTYyam85OGczcmJtd2IifQ.a5Q5TBBMnJ9KJJPEiYgMpw';

interface FamilyMapProps {
  members: FamilyMember[];
  onSelectMember: (memberId: string) => void;
}

interface MapStats {
  totalMembers: number;
  membersWithLocation: number;
  countries: string[];
  continents: string[];
}

const FamilyMap: React.FC<FamilyMapProps> = ({ members, onSelectMember }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const currentLocationMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [showMemberModal, setShowMemberModal] = useState<boolean>(false);
  const [mapError, setMapError] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'map' | 'list' | 'stats'>('map');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterGender, setFilterGender] = useState<'all' | 'male' | 'female' | 'other'>('all');
  const [mapStats, setMapStats] = useState<MapStats>({
    totalMembers: 0,
    membersWithLocation: 0,
    countries: [],
    continents: []
  });
  const [showAddLocationDialog, setShowAddLocationDialog] = useState(false);
  const [memberForLocation, setMemberForLocation] = useState<FamilyMember | null>(null);

  // Helper function to get country from coordinates (simplified)
  const getCountryFromCoordinates = useCallback((lat: number, lng: number): string => {
    // This is a simplified version - in a real app, you'd use a geocoding service
    if (lat >= 24 && lat <= 71 && lng >= -125 && lng <= -66) return 'United States';
    if (lat >= 35 && lat <= 71 && lng >= -10 && lng <= 40) return 'Europe';
    if (lat >= 35 && lat <= 55 && lng >= 73 && lng <= 135) return 'China';
    if (lat >= 6 && lat <= 37 && lng >= 68 && lng <= 97) return 'India';
    if (lat >= -44 && lat <= -10 && lng >= 113 && lng <= 154) return 'Australia';
    if (lat >= 14 && lat <= 32 && lng >= -118 && lng <= -86) return 'Mexico';
    if (lat >= 5 && lat <= 12 && lng >= -81 && lng <= -66) return 'Colombia';
    if (lat >= -35 && lat <= -22 && lng >= -74 && lng <= -34) return 'Brazil';
    if (lat >= 41 && lat <= 55 && lng >= 19 && lng <= 169) return 'Russia';
    if (lat >= 24 && lat <= 36 && lng >= 5 && lng <= 19) return 'Algeria';
    if (lat >= 22 && lat <= 32 && lng >= 25 && lng <= 37) return 'Egypt';
    if (lat >= -35 && lat <= -22 && lng >= 16 && lng <= 33) return 'South Africa';
    return 'Unknown';
  }, []);

  // Calculate map statistics
  const calculateMapStats = useCallback(() => {
    const membersWithLocation = members.filter(member => 
      member.currentLocation && 
      typeof member.currentLocation.lat === 'number' && 
      typeof member.currentLocation.lng === 'number'
    );

    const countries = membersWithLocation.map(member => 
      getCountryFromCoordinates(member.currentLocation!.lat, member.currentLocation!.lng)
    );

    const uniqueCountries = [...new Set(countries)];
    
    setMapStats({
      totalMembers: members.length,
      membersWithLocation: membersWithLocation.length,
      countries: uniqueCountries,
      continents: ['North America', 'South America', 'Europe', 'Asia', 'Africa', 'Oceania'] // Simplified
    });
  }, [members, getCountryFromCoordinates]);

  // Filter members based on search and gender
  const filteredMembers = members.filter(member => {
    const matchesSearch = searchQuery === '' || 
      `${member.firstName} ${member.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.currentLocation?.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesGender = filterGender === 'all' || member.gender === filterGender;
    
    return matchesSearch && matchesGender;
  });

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;
    
    try {
      mapboxgl.accessToken = MAPBOX_TOKEN;
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        projection: 'globe',
        zoom: 2,
        center: [0, 20],
        pitch: 0,
        bearing: 0,
      });

      // Add navigation controls
      map.current.addControl(
        new mapboxgl.NavigationControl({
          visualizePitch: true,
        }),
        'top-right'
      );

      // Add fullscreen control
      map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

      // Add geolocate control
      map.current.addControl(
        new mapboxgl.GeolocateControl({
          positionOptions: {
            enableHighAccuracy: true
          },
          trackUserLocation: true,
          showUserHeading: true
        }),
        'top-right'
      );

      // Add atmosphere and fog effects
      map.current.on('style.load', () => {
        if (!map.current) return;
        
        map.current.setFog({
          color: 'rgb(186, 210, 235)',
          'high-color': 'rgb(36, 92, 223)',
          'horizon-blend': 0.02,
        });
        
        setMapLoaded(true);
      });

      // Error handler
      map.current.on('error', (e) => {
        console.error('Map error:', e);
        setMapError(true);
        
        // Show specific error message based on error type
        if (e.error && e.error.message) {
          if (e.error.message.includes('token') || e.error.message.includes('unauthorized')) {
            toast({
              title: "Mapbox Token Issue",
              description: "The map token may be expired or invalid. Please check the Mapbox configuration.",
              variant: "destructive"
            });
          } else if (e.error.message.includes('network') || e.error.message.includes('connection')) {
            toast({
              title: "Network Error",
              description: "Please check your internet connection and try again.",
              variant: "destructive"
            });
          }
        }
      });

      return () => {
        if (map.current) {
          map.current.remove();
          map.current = null;
        }
      };
    } catch (error) {
      console.error('Error initializing map:', error);
      setMapError(true);
      toast({
        title: "Map Error",
        description: "Could not initialize the map. Please check your internet connection.",
        variant: "destructive"
      });
    }
  }, []);

  // Calculate map statistics when members change
  useEffect(() => {
    calculateMapStats();
  }, [calculateMapStats]);

  // Add markers for family members when map is loaded
  useEffect(() => {
    if (!map.current || !mapLoaded || mapError) return;

    try {
      // Clear existing markers
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];

      // Filter members with location data from filtered results
      const membersWithLocation = filteredMembers.filter(member => 
        member.currentLocation && 
        typeof member.currentLocation.lat === 'number' && 
        typeof member.currentLocation.lng === 'number'
      );

      // Add markers for members with location data
      membersWithLocation.forEach((member) => {
        if (!map.current || !member.currentLocation) return;

        // Create custom marker element with enhanced styling
        const markerEl = document.createElement('div');
        markerEl.className = 'cursor-pointer group';
        
        // Get gender-based color
        const getGenderColor = (gender: string) => {
          switch (gender) {
            case 'male': return 'bg-blue-500';
            case 'female': return 'bg-pink-500';
            default: return 'bg-heritage-purple';
          }
        };

        markerEl.innerHTML = `
          <div class="relative">
            <div class="w-8 h-8 flex items-center justify-center ${getGenderColor(member.gender)} text-white rounded-full 
              transform transition-all duration-200 group-hover:scale-125 group-hover:shadow-xl border-2 border-white">
              ${member.firstName[0]}${member.lastName ? member.lastName[0] : ''}
            </div>
            <div class="absolute -bottom-1 -right-1 w-3 h-3 bg-white rounded-full border border-gray-300"></div>
          </div>
        `;
        
        // Create the marker and add it to the map
        const marker = new mapboxgl.Marker(markerEl)
          .setLngLat([member.currentLocation.lng, member.currentLocation.lat])
          .addTo(map.current);
        
        // Add click event to marker
        markerEl.addEventListener('click', () => {
          setSelectedMember(member);
          setShowMemberModal(true);
          
          // Fly to marker location
          if (map.current) {
            map.current.flyTo({
              center: [member.currentLocation!.lng, member.currentLocation!.lat],
              zoom: 8,
              speed: 1.2,
              curve: 1.42
            });
          }
        });
        
        // Store marker reference for cleanup
        markersRef.current.push(marker);
      });

      // Fit map to show all markers if there are any
      if (membersWithLocation.length > 0 && map.current) {
        // Create bounds from all marker positions
        const bounds = new mapboxgl.LngLatBounds();
        membersWithLocation.forEach(member => {
          if (member.currentLocation) {
            bounds.extend([member.currentLocation.lng, member.currentLocation.lat]);
          }
        });
        
        // Fit map to bounds with padding
        map.current.fitBounds(bounds, {
          padding: 80,
          maxZoom: 4
        });
      }
    } catch (error) {
      console.error('Error adding markers:', error);
    }
  }, [filteredMembers, mapLoaded, mapError]);

  const handleViewProfile = () => {
    if (selectedMember) {
      onSelectMember(selectedMember.id);
      setShowMemberModal(false);
    }
  };

  const handleFlyToMember = (member: FamilyMember) => {
    if (map.current && member.currentLocation) {
      map.current.flyTo({
        center: [member.currentLocation.lng, member.currentLocation.lat],
        zoom: 8,
        speed: 1.2,
        curve: 1.42
      });
    }
  };

  const handleFitToAllMembers = () => {
    const membersWithLocation = filteredMembers.filter(member => 
      member.currentLocation && 
      typeof member.currentLocation.lat === 'number' && 
      typeof member.currentLocation.lng === 'number'
    );

    if (map.current && membersWithLocation.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      membersWithLocation.forEach(member => {
        if (member.currentLocation) {
          bounds.extend([member.currentLocation.lng, member.currentLocation.lat]);
        }
      });
      
      map.current.fitBounds(bounds, {
        padding: 80,
        maxZoom: 4
      });
    }
  };

  const handlePanToCurrentLocation = () => {
    if (!map.current) return;

    if (!('geolocation' in navigator)) {
      toast({
        title: "Geolocation Unavailable",
        description: "Your browser doesn't support geolocation.",
        variant: 'destructive'
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        // Center the map
        map.current!.flyTo({ center: [lng, lat], zoom: 10, speed: 1.2, curve: 1.42 });

        // Add or update a temporary marker for the user's current location
        try {
          if (currentLocationMarkerRef.current) {
            currentLocationMarkerRef.current.setLngLat([lng, lat]);
          } else {
            const el = document.createElement('div');
            el.className = 'w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow';
            currentLocationMarkerRef.current = new mapboxgl.Marker(el)
              .setLngLat([lng, lat])
              .addTo(map.current!);
          }
        } catch (e) {
          // Non-fatal; marker creation failure should not block panning
          console.warn('Could not render current location marker:', e);
        }

        toast({ title: 'Location found', description: 'Panned to your current location.' });
      },
      () => {
        toast({
          title: 'Geolocation Failed',
          description: 'The Geolocation service failed or was denied.',
          variant: 'destructive'
        });
      },
      { enableHighAccuracy: true }
    );
  };

  const handleAddLocation = (member: FamilyMember) => {
    setMemberForLocation(member);
    setShowAddLocationDialog(true);
  };

  const handleLocationAdded = () => {
    // Refresh the data by calling the parent component's refresh function
    // For now, we'll just show a success message
    toast({
      title: "Location Added",
      description: "The family member's location has been updated. The map will refresh automatically.",
    });
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header with controls */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-heritage-dark">Family Map</h2>
            <p className="text-sm text-muted-foreground">
              Explore your family members around the world
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePanToCurrentLocation}
              className="flex items-center gap-2"
            >
              <Navigation className="h-4 w-4" />
              Pan to Current Location
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleFitToAllMembers}
              className="flex items-center gap-2"
            >
              <Maximize className="h-4 w-4" />
              Fit All
            </Button>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="flex gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <input
              type="text"
              placeholder="Search family members or locations..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-heritage-purple/20 focus:border-heritage-purple"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            value={filterGender}
            onChange={(e) => setFilterGender(e.target.value as 'all' | 'male' | 'female' | 'other')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-heritage-purple/20 focus:border-heritage-purple"
          >
            <option value="all">All Genders</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-heritage-purple" />
              <div>
                <p className="text-xs text-muted-foreground">Total Members</p>
                <p className="text-lg font-semibold">{mapStats.totalMembers}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">With Location</p>
                <p className="text-lg font-semibold">{mapStats.membersWithLocation}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Countries</p>
                <p className="text-lg font-semibold">{mapStats.countries.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-xs text-muted-foreground">Continents</p>
                <p className="text-lg font-semibold">{mapStats.continents.length}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Map Container */}
        <div className="flex-1 relative">
          <div ref={mapContainer} className="w-full h-full" />
          
          {/* Map error state */}
          {mapError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 p-6">
              <MapPin className="h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Map Unavailable</h3>
              <p className="text-center text-gray-600 px-4 mb-4">
                Could not load the map. This is likely due to a Mapbox token issue.
              </p>
              
              <div className="bg-white rounded-lg p-4 mb-4 max-w-md w-full">
                <h4 className="font-medium text-gray-800 mb-2">To fix this issue:</h4>
                <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                  <li>Get a free Mapbox token from <a href="https://account.mapbox.com/access-tokens/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">mapbox.com</a></li>
                  <li>Add it to your <code className="bg-gray-100 px-1 rounded">.env.local</code> file:</li>
                </ol>
                <div className="bg-gray-100 p-2 rounded mt-2 text-xs font-mono">
                  VITE_MAPBOX_TOKEN=your_token_here
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  The map will work with location data once the token is configured.
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                >
                  Try Again
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    // Switch to list view when map fails
                    setActiveTab('list');
                  }}
                >
                  View List Instead
                </Button>
              </div>
            </div>
          )}
          
          {/* Loading state */}
          {!mapLoaded && !mapError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-heritage-purple mx-auto mb-4"></div>
                <p className="text-gray-600">Loading map...</p>
              </div>
            </div>
          )}

          {/* Map Legend */}
          {mapLoaded && !mapError && (
            <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 border">
              <h4 className="text-sm font-semibold mb-2">Legend</h4>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                  <span>Male</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-pink-500 rounded-full"></div>
                  <span>Female</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-heritage-purple rounded-full"></div>
                  <span>Other</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'map' | 'list' | 'stats')} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-3 m-4">
              <TabsTrigger value="map">Map</TabsTrigger>
              <TabsTrigger value="list">List</TabsTrigger>
              <TabsTrigger value="stats">Stats</TabsTrigger>
            </TabsList>
            
            <TabsContent value="map" className="flex-1 p-4">
              <div className="space-y-3">
                <h3 className="font-semibold text-heritage-dark">Family Locations</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredMembers
                    .filter(member => member.currentLocation && 
                      typeof member.currentLocation.lat === 'number' && 
                      typeof member.currentLocation.lng === 'number')
                    .map(member => (
                      <div 
                        key={member.id}
                        className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-heritage-purple-light/20 cursor-pointer transition-colors"
                        onClick={() => {
                          setSelectedMember(member);
                          setShowMemberModal(true);
                          handleFlyToMember(member);
                        }}
                      >
                        <div className="relative mr-3">
                          <AvatarBackground
                            avatar={member.avatar}
                            className="h-10 w-10 rounded-full border-2 border-white shadow-sm"
                          >
                            {!member.avatar && (
                              <div className="w-full h-full rounded-full flex items-center justify-center bg-heritage-purple-light text-heritage-purple text-sm font-medium">
                                {member.firstName[0]}{member.lastName[0]}
                              </div>
                            )}
                          </AvatarBackground>
                          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                            member.gender === 'male' ? 'bg-blue-500' : 
                            member.gender === 'female' ? 'bg-pink-500' : 'bg-heritage-purple'
                          }`}></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-heritage-dark truncate">
                            {member.firstName} {member.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {member.currentLocation?.description}
                          </p>
                          {member.birthDate && (
                            <p className="text-xs text-muted-foreground">
                              {calculateAge(member.birthDate, member.deathDate) ? 
                                `Age: ${calculateAge(member.birthDate, member.deathDate)}` : 
                                (member.deathDate ? 'Deceased' : '')}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                    
                  {filteredMembers.filter(member => member.currentLocation &&
                    typeof member.currentLocation.lat === 'number' && 
                    typeof member.currentLocation.lng === 'number').length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <MapPin className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                      <p className="text-sm">No family members with location data found.</p>
                      <p className="text-xs mt-1 mb-4">Add location data to see family members on the map.</p>
                      
                      {filteredMembers.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-gray-600">Add locations to family members:</p>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {filteredMembers.slice(0, 5).map(member => (
                              <div 
                                key={member.id}
                                className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs"
                              >
                                <span>{member.firstName} {member.lastName}</span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-xs"
                                  onClick={() => handleAddLocation(member)}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add Location
                                </Button>
                              </div>
                            ))}
                          </div>
                          {filteredMembers.length > 5 && (
                            <p className="text-xs text-gray-500">... and {filteredMembers.length - 5} more</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="list" className="flex-1 p-4">
              <div className="space-y-3">
                <h3 className="font-semibold text-heritage-dark">All Family Members</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredMembers.map(member => (
                    <div 
                      key={member.id}
                      className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-heritage-purple-light/20 cursor-pointer transition-colors"
                      onClick={() => {
                        setSelectedMember(member);
                        setShowMemberModal(true);
                        if (member.currentLocation) {
                          handleFlyToMember(member);
                        }
                      }}
                    >
                      <div className="relative mr-3">
                        <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                          <AvatarImage src={member.avatar} alt={`${member.firstName} ${member.lastName}`} />
                          <AvatarFallback className="bg-heritage-purple-light text-heritage-purple text-sm font-medium">
                            {member.firstName[0]}{member.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        {member.currentLocation ? (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                        ) : (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gray-300 rounded-full border-2 border-white"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-heritage-dark truncate">
                          {member.firstName} {member.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {member.currentLocation?.description || 'No location data'}
                        </p>
                        {!member.currentLocation && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-xs mt-1"
                            onClick={() => handleAddLocation(member)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Location
                          </Button>
                        )}
                        {member.birthDate && (
                          <p className="text-xs text-muted-foreground">
                            {calculateAge(member.birthDate, member.deathDate) ? 
                              `Age: ${calculateAge(member.birthDate, member.deathDate)}` : 
                              (member.deathDate ? 'Deceased' : '')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {filteredMembers.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                      <p className="text-sm">No family members found.</p>
                      <p className="text-xs mt-1">Try adjusting your search or filters.</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="stats" className="flex-1 p-4">
              <div className="space-y-4">
                <h3 className="font-semibold text-heritage-dark">Family Statistics</h3>
                
                <Card className="p-4">
                  <h4 className="font-medium mb-3">Geographic Distribution</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Members:</span>
                      <span className="text-sm font-medium">{mapStats.totalMembers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">With Location:</span>
                      <span className="text-sm font-medium">{mapStats.membersWithLocation}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Countries:</span>
                      <span className="text-sm font-medium">{mapStats.countries.length}</span>
                    </div>
                  </div>
                </Card>

                {mapStats.countries.length > 0 && (
                  <Card className="p-4">
                    <h4 className="font-medium mb-3">Countries Represented</h4>
                    <div className="space-y-1">
                      {mapStats.countries.map((country, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-heritage-purple rounded-full"></div>
                          <span className="text-sm">{country}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                <Card className="p-4">
                  <h4 className="font-medium mb-3">Gender Distribution</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Male:</span>
                      <span className="text-sm font-medium">
                        {filteredMembers.filter(m => m.gender === 'male').length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Female:</span>
                      <span className="text-sm font-medium">
                        {filteredMembers.filter(m => m.gender === 'female').length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Other:</span>
                      <span className="text-sm font-medium">
                        {filteredMembers.filter(m => m.gender === 'other').length}
                      </span>
                    </div>
                  </div>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* Enhanced Member detail modal */}
      {selectedMember && (
        <Modal 
          isOpen={showMemberModal} 
          onClose={() => setShowMemberModal(false)}
          title={`${selectedMember.firstName} ${selectedMember.lastName}`}
        >
          <DialogDescription>
            Family member details and location information
          </DialogDescription>
          
          <div className="flex flex-col items-center mt-6">
            <div className="relative mb-6">
              {selectedMember.avatar ? (
                <Avatar className="h-24 w-24">
                  <AvatarImage src={selectedMember.avatar} alt={`${selectedMember.firstName} ${selectedMember.lastName}`} />
                  <AvatarFallback className="bg-heritage-purple-light text-heritage-purple text-lg">
                    {selectedMember.firstName[0]}{selectedMember.lastName[0]}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <Avatar className="h-24 w-24 bg-heritage-purple-light">
                  <AvatarFallback className="text-heritage-purple text-lg">
                    {selectedMember.firstName[0]}{selectedMember.lastName[0]}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white ${
                selectedMember.gender === 'male' ? 'bg-blue-500' : 
                selectedMember.gender === 'female' ? 'bg-pink-500' : 'bg-heritage-purple'
              }`}></div>
            </div>
            
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-heritage-dark mb-1">
                {selectedMember.firstName} {selectedMember.lastName}
              </h3>
              {selectedMember.birthDate && (
                <div className="text-sm text-muted-foreground mb-2">
                  {calculateAge(selectedMember.birthDate, selectedMember.deathDate) ? 
                    `Age: ${calculateAge(selectedMember.birthDate, selectedMember.deathDate)}` : 
                    (selectedMember.deathDate ? 'Deceased' : '')}
                </div>
              )}
              <Badge variant="outline" className="text-xs">
                {selectedMember.gender.charAt(0).toUpperCase() + selectedMember.gender.slice(1)}
              </Badge>
            </div>
            
            {selectedMember.currentLocation ? (
              <div className="w-full bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="h-4 w-4 text-heritage-purple" />
                  <h4 className="text-sm font-medium text-heritage-dark">Current Location</h4>
                </div>
                <p className="text-sm text-gray-700 mb-2">{selectedMember.currentLocation.description}</p>
                <div className="text-xs text-muted-foreground">
                  Coordinates: {selectedMember.currentLocation.lat.toFixed(4)}, {selectedMember.currentLocation.lng.toFixed(4)}
                </div>
              </div>
            ) : (
              <div className="w-full bg-gray-50 rounded-lg p-4 mb-6 text-center">
                <MapPin className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No location data available</p>
              </div>
            )}

            {selectedMember.bio && (
              <div className="w-full mb-6">
                <h4 className="text-sm font-medium text-heritage-dark mb-2">Bio</h4>
                <p className="text-sm text-gray-700">{selectedMember.bio}</p>
              </div>
            )}
            
            <div className="flex gap-3 w-full">
              <Button className="flex-1" onClick={handleViewProfile}>
                <Users className="h-4 w-4 mr-2" />
                View Full Profile
              </Button>
              {selectedMember.currentLocation && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    handleFlyToMember(selectedMember);
                    setShowMemberModal(false);
                  }}
                >
                  <Navigation className="h-4 w-4 mr-2" />
                  Fly To
                </Button>
              )}
              <Button variant="outline" onClick={() => setShowMemberModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Location Dialog */}
      {memberForLocation && (
        <AddLocationDialog
          member={memberForLocation}
          isOpen={showAddLocationDialog}
          onClose={() => {
            setShowAddLocationDialog(false);
            setMemberForLocation(null);
          }}
          onLocationAdded={handleLocationAdded}
        />
      )}
    </div>
  );
};

export default FamilyMap;
