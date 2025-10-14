
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { FamilyMember, FamilyStory } from '@/types';
import { addFamilyStory, getFamilyMembers } from '@/services/supabaseService';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Check, Plus, X } from 'lucide-react';
import { useEffect } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { AvatarImage, AvatarFallback } from '@/components/ui/avatar';

// Form schema validation
const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  date: z.string().optional(),
  relatedMembers: z.array(z.string()).default([]),
});

type FormValues = z.infer<typeof formSchema>;

interface AddStoryProps {
  onClose?: () => void;
  onSuccess?: (story: FamilyStory) => void;
}

const AddStory: React.FC<AddStoryProps> = ({ onClose, onSuccess }) => {
  const navigate = useNavigate();
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<FamilyMember[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      content: '',
      date: new Date().toISOString().split('T')[0],
      relatedMembers: [],
    },
  });
  
  // Load family members
  useEffect(() => {
    const loadFamilyMembers = async () => {
      try {
        const members = await getFamilyMembers();
        setFamilyMembers(members);
      } catch (error) {
        console.error('Error loading family members:', error);
      }
    };
    
    loadFamilyMembers();
  }, []);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      setUploadedFiles(prev => [...prev, ...filesArray]);
    }
  };
  
  const removeFile = (indexToRemove: number) => {
    setUploadedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };
  
  const toggleMember = (member: FamilyMember) => {
    const isSelected = selectedMembers.some(m => m.id === member.id);
    
    if (isSelected) {
      setSelectedMembers(prev => prev.filter(m => m.id !== member.id));
      form.setValue('relatedMembers', form.getValues('relatedMembers').filter(id => id !== member.id));
    } else {
      setSelectedMembers(prev => [...prev, member]);
      form.setValue('relatedMembers', [...form.getValues('relatedMembers'), member.id]);
    }
  };
  
  const onSubmit = async (values: FormValues) => {
    try {
      setIsLoading(true);
      
      const storyData: Omit<FamilyStory, 'id' | 'authorId' | 'images'> = {
        title: values.title,
        content: values.content,
        date: values.date || new Date().toISOString().split('T')[0],
        relatedMembers: values.relatedMembers,
      };
      
      const newStory = await addFamilyStory(storyData, uploadedFiles);
      
      if (newStory) {
        toast({
          title: "Success",
          description: "Your story has been added.",
        });
        
        if (onSuccess) {
          onSuccess(newStory);
        }
        
        if (onClose) {
          onClose();
        } else {
          // Navigate back to stories or home
          navigate('/');
        }
      }
    } catch (error) {
      console.error('Error adding story:', error);
      toast({
        title: "Error",
        description: "Could not add story. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-heritage-dark">Add Family Story</h2>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input placeholder="Story title" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Story</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Write your family story here..." 
                    className="min-h-[150px]"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="space-y-2">
            <FormLabel>Related Family Members</FormLabel>
            <div className="flex flex-wrap gap-2 mb-2">
              {selectedMembers.map(member => (
                <Badge 
                  key={member.id} 
                  variant="secondary"
                  className="flex items-center gap-1 pl-2 pr-1 py-1"
                >
                  {`${member.firstName} ${member.lastName}`}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 ml-1"
                    onClick={() => toggleMember(member)}
                  >
                    <X className="h-3 w-3" />
                    <span className="sr-only">Remove</span>
                  </Button>
                </Badge>
              ))}
            </div>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex items-center gap-1"
                >
                  <Plus className="h-4 w-4" /> Add Family Member
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 max-h-60 overflow-y-auto p-2">
                <div className="space-y-1">
                  {familyMembers.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-2">No family members found</p>
                  ) : (
                    familyMembers.map(member => {
                      const isSelected = selectedMembers.some(m => m.id === member.id);
                      return (
                        <button
                          key={member.id}
                          className={`flex items-center justify-between w-full p-2 text-sm rounded-md ${
                            isSelected ? 'bg-heritage-purple-light/20' : 'hover:bg-muted'
                          }`}
                          onClick={() => toggleMember(member)}
                          type="button"
                        >
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              {member.avatar ? (
                                <AvatarImage src={member.avatar} alt={member.firstName} />
                              ) : (
                                <AvatarFallback className="text-xs">
                                  {member.firstName[0]}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <span>{`${member.firstName} ${member.lastName}`}</span>
                          </div>
                          {isSelected && <Check className="h-4 w-4 text-heritage-purple" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="space-y-2">
            <FormLabel>Photos</FormLabel>
            <div className="grid grid-cols-3 gap-2">
              {uploadedFiles.map((file, index) => (
                <div 
                  key={index} 
                  className="relative aspect-square bg-muted rounded-md overflow-hidden"
                >
                  <img 
                    src={URL.createObjectURL(file)} 
                    alt={`Upload ${index}`} 
                    className="h-full w-full object-cover"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6"
                    onClick={() => removeFile(index)}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Remove image</span>
                  </Button>
                </div>
              ))}
              <label className="aspect-square border-2 border-dashed flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground rounded-md cursor-pointer">
                <div className="flex flex-col items-center">
                  <Plus className="h-8 w-8" />
                  <span className="text-xs mt-1">Add Photo</span>
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  multiple
                  onChange={handleFileChange}
                />
              </label>
            </div>
          </div>
          
          <div className="pt-4">
            <Button 
              type="submit" 
              className="w-full bg-heritage-purple hover:bg-heritage-purple-medium"
              disabled={isLoading}
            >
              {isLoading ? 'Adding...' : 'Add Story'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default AddStory;
