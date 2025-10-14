
import { FamilyStory } from "@/types";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { formatDate } from "@/utils/dateUtils";

interface StoryCardProps {
  story: FamilyStory;
  authorName: string;
  onView: () => void;
}

const StoryCard: React.FC<StoryCardProps> = ({ story, authorName, onView }) => {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer" onClick={onView}>
      {story.images && story.images.length > 0 && (
        <div className="aspect-video w-full overflow-hidden">
          <img 
            src={story.images[0]} 
            alt={story.title}
            className="w-full h-full object-cover transition-transform hover:scale-105"
          />
        </div>
      )}
      
      <CardHeader className="p-4 pb-0">
        <div className="text-sm text-muted-foreground">{formatDate(story.date)}</div>
        <h3 className="font-serif text-lg font-medium text-heritage-dark">{story.title}</h3>
      </CardHeader>
      
      <CardContent className="p-4 pt-2">
        <p className="text-sm line-clamp-3 text-muted-foreground">
          {story.content}
        </p>
      </CardContent>
      
      <CardFooter className="p-4 pt-0 flex items-center justify-between">
        <div className="text-xs text-heritage-purple">By {authorName}</div>
        <div className="text-xs text-muted-foreground">
          {story.relatedMembers.length} family members
        </div>
      </CardFooter>
    </Card>
  );
};

export default StoryCard;
