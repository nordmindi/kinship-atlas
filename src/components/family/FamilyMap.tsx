
import React, { useEffect, useRef, useState } from 'react';
import { FamilyMember } from '@/types';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Modal } from '@/components/ui/modal';
import { DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { calculateAge } from '@/utils/dateUtils';
import { Map, MapPin, Compass } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Use a public Mapbox token (create a new token from mapbox.com with restricted URLs)
const MAPBOX_TOKEN = 'pk.eyJ1IjoibG92YWJsZWFpIiwiYSI6ImNsdWs2OWdtcDA0YTYyam85OGczcmJtd2IifQ.a5Q5TBBMnJ9KJJPEiYgMpw';

interface FamilyMapProps {
  members: FamilyMember[];
  onSelectMember: (memberId: string) => void;
}

const FamilyMap: React.FC<FamilyMapProps> = ({ members, onSelectMember }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [showMemberModal, setShowMemberModal] = useState<boolean>(false);
  const [mapError, setMapError] = useState<boolean>(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;
    
    try {
      mapboxgl.accessToken = MAPBOX_TOKEN;
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        projection: 'globe',
        zoom: 1.5,
        center: [0, 20],
        pitch: 30,
      });

      map.current.addControl(
        new mapboxgl.NavigationControl({
          visualizePitch: true,
        }),
        'top-right'
      );

      // Add atmosphere and fog effects
      map.current.on('style.load', () => {
        if (!map.current) return;
        
        map.current.setFog({
          color: 'rgb(255, 255, 255)',
          'high-color': 'rgb(200, 200, 225)',
          'horizon-blend': 0.2,
        });
        
        setMapLoaded(true);
      });

      // Globe rotation animation
      const secondsPerRevolution = 180;
      const maxSpinZoom = 4;
      const slowSpinZoom = 2;
      let userInteracting = false;
      let spinEnabled = true;

      function spinGlobe() {
        if (!map.current) return;
        
        const zoom = map.current.getZoom();
        if (spinEnabled && !userInteracting && zoom < maxSpinZoom) {
          let distancePerSecond = 360 / secondsPerRevolution;
          if (zoom > slowSpinZoom) {
            const zoomDif = (maxSpinZoom - zoom) / (maxSpinZoom - slowSpinZoom);
            distancePerSecond *= zoomDif;
          }
          const center = map.current.getCenter();
          center.lng -= distancePerSecond / 60;
          map.current.easeTo({ center, duration: 1000, easing: (n) => n });
        }
      }

      // Setup event listeners for interaction
      map.current.on('mousedown', () => {
        userInteracting = true;
      });
      
      map.current.on('dragstart', () => {
        userInteracting = true;
      });
      
      map.current.on('mouseup', () => {
        userInteracting = false;
        setTimeout(spinGlobe, 1000);
      });
      
      map.current.on('touchend', () => {
        userInteracting = false;
        setTimeout(spinGlobe, 1000);
      });

      // Error handler
      map.current.on('error', (e) => {
        console.error('Map error:', e);
        setMapError(true);
      });

      // Start spinning
      const spinInterval = setInterval(spinGlobe, 1000);

      return () => {
        clearInterval(spinInterval);
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

  // Add markers for family members when map is loaded
  useEffect(() => {
    if (!map.current || !mapLoaded || mapError) return;

    try {
      // Clear existing markers
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];

      // Filter members with location data
      const membersWithLocation = members.filter(member => 
        member.currentLocation && 
        typeof member.currentLocation.lat === 'number' && 
        typeof member.currentLocation.lng === 'number'
      );

      // Add markers for members with location data
      membersWithLocation.forEach((member) => {
        if (!map.current || !member.currentLocation) return;

        // Create custom marker element
        const markerEl = document.createElement('div');
        markerEl.className = 'cursor-pointer group';
        markerEl.innerHTML = `
          <div class="w-6 h-6 flex items-center justify-center bg-heritage-purple text-white rounded-full 
            transform transition-transform group-hover:scale-110 group-hover:shadow-lg">
            ${member.firstName[0]}${member.lastName ? member.lastName[0] : ''}
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
          padding: 100,
          maxZoom: 3
        });
      }
    } catch (error) {
      console.error('Error adding markers:', error);
    }
  }, [members, mapLoaded, mapError]);

  const handleViewProfile = () => {
    if (selectedMember) {
      onSelectMember(selectedMember.id);
      setShowMemberModal(false);
    }
  };

  return (
    <div className="p-4 h-full flex flex-col">
      <Card className="bg-white rounded-lg shadow-md p-4 mb-4">
        <h2 className="text-lg font-medium text-heritage-dark mb-2">Family Map</h2>
        <p className="text-sm text-muted-foreground mb-4">
          View your family members around the world
        </p>
        <div className="relative w-full h-64 sm:h-80 rounded-lg border border-heritage-blue/30 overflow-hidden">
          {/* Map container */}
          <div ref={mapContainer} className="w-full h-full" />
          
          {/* Map error state */}
          {mapError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100">
              <MapPin className="h-10 w-10 text-gray-400 mb-2" />
              <p className="text-center text-gray-600 px-4">
                Could not load the map. Please check your internet connection.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => window.location.reload()}
              >
                Try Again
              </Button>
            </div>
          )}
          
          {/* Loading state */}
          {!mapLoaded && !mapError && (
            <div className="absolute inset-0 flex items-center justify-center bg-heritage-blue/10">
              <div className="space-y-2">
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-4 w-[150px]" />
              </div>
            </div>
          )}
        </div>
      </Card>
      
      <div className="flex-1 overflow-auto pb-4">
        <h3 className="text-md font-medium text-heritage-dark mb-2">Family Locations</h3>
        <div className="space-y-1">
          {members
            .filter(member => member.currentLocation && 
              typeof member.currentLocation.lat === 'number' && 
              typeof member.currentLocation.lng === 'number')
            .map(member => (
              <div 
                key={member.id}
                className="flex items-center p-2 bg-white rounded-lg border border-heritage-purple/10 hover:bg-heritage-purple-light/20 cursor-pointer"
                onClick={() => {
                  setSelectedMember(member);
                  setShowMemberModal(true);
                  
                  // Fly to member's location on the map
                  if (map.current && member.currentLocation) {
                    map.current.flyTo({
                      center: [member.currentLocation.lng, member.currentLocation.lat],
                      zoom: 4,
                      speed: 0.8,
                      curve: 1
                    });
                  }
                }}
              >
                <div 
                  className="h-8 w-8 rounded-full bg-cover bg-center mr-3 border border-heritage-purple/30"
                  style={{ backgroundImage: member.avatar ? `url(${member.avatar})` : undefined }}
                >
                  {!member.avatar && (
                    <div className="w-full h-full rounded-full flex items-center justify-center bg-heritage-purple-light text-heritage-purple text-xs font-medium">
                      {member.firstName[0]}{member.lastName[0]}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-heritage-dark">
                    {member.firstName} {member.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {member.currentLocation?.description}
                  </p>
                </div>
              </div>
            ))}
            
          {members.filter(member => member.currentLocation &&
            typeof member.currentLocation.lat === 'number' && 
            typeof member.currentLocation.lng === 'number').length === 0 && (
            <div className="text-center py-6 text-muted-foreground text-sm">
              No family members with location data available.
            </div>
          )}
        </div>
      </div>
      
      {/* Member detail modal */}
      {selectedMember && (
        <Modal 
          isOpen={showMemberModal} 
          onClose={() => setShowMemberModal(false)}
          title={`${selectedMember.firstName} ${selectedMember.lastName}`}
        >
          <DialogDescription>
            Location details
          </DialogDescription>
          
          <div className="flex flex-col items-center mt-4">
            {selectedMember.avatar ? (
              <Avatar className="h-20 w-20 mb-4">
                <AvatarImage src={selectedMember.avatar} alt={`${selectedMember.firstName} ${selectedMember.lastName}`} />
                <AvatarFallback className="bg-heritage-purple-light text-heritage-purple">
                  {selectedMember.firstName[0]}{selectedMember.lastName[0]}
                </AvatarFallback>
              </Avatar>
            ) : (
              <Avatar className="h-20 w-20 mb-4 bg-heritage-purple-light">
                <AvatarFallback className="text-heritage-purple">
                  {selectedMember.firstName[0]}{selectedMember.lastName[0]}
                </AvatarFallback>
              </Avatar>
            )}
            
            {selectedMember.birthDate && (
              <div className="text-sm text-muted-foreground mb-2">
                {calculateAge(selectedMember.birthDate, selectedMember.deathDate) ? 
                  `Age: ${calculateAge(selectedMember.birthDate, selectedMember.deathDate)}` : 
                  (selectedMember.deathDate ? 'Deceased' : '')}
              </div>
            )}
            
            {selectedMember.currentLocation && (
              <div className="w-full mt-4">
                <h4 className="text-sm font-medium text-heritage-dark">Current Location</h4>
                <p className="text-sm">{selectedMember.currentLocation.description}</p>
                <div className="mt-2 text-xs text-muted-foreground">
                  Coordinates: {selectedMember.currentLocation.lat.toFixed(4)}, {selectedMember.currentLocation.lng.toFixed(4)}
                </div>
              </div>
            )}
            
            <div className="flex gap-2 mt-6 w-full">
              <Button className="flex-1" onClick={handleViewProfile}>
                View Full Profile
              </Button>
              <Button variant="outline" onClick={() => setShowMemberModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default FamilyMap;
