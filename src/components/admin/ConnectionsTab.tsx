import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';
import { RelationshipType } from '@/services/familyRelationshipManager';

export interface AdminRelation {
  id: string;
  fromMemberId: string;
  toMemberId: string;
  relationType: RelationshipType;
  fromMember?: { firstName: string; lastName: string };
  toMember?: { firstName: string; lastName: string };
}

interface ConnectionsTabProps {
  relations: AdminRelation[];
  searchQuery: string;
  onDelete: (relationId: string) => Promise<void>;
}

/**
 * Connections management tab component
 */
export const ConnectionsTab: React.FC<ConnectionsTabProps> = ({
  relations,
  searchQuery,
  onDelete,
}) => {
  const filteredRelations = useMemo(() => {
    if (!searchQuery) return relations;
    const query = searchQuery.toLowerCase();
    return relations.filter(rel => {
      const fromName = rel.fromMember 
        ? `${rel.fromMember.firstName} ${rel.fromMember.lastName}` 
        : rel.fromMemberId;
      const toName = rel.toMember 
        ? `${rel.toMember.firstName} ${rel.toMember.lastName}` 
        : rel.toMemberId;
      return fromName.toLowerCase().includes(query) ||
             toName.toLowerCase().includes(query) ||
             rel.relationType.toLowerCase().includes(query);
    });
  }, [relations, searchQuery]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connections Management</CardTitle>
        <CardDescription>
          View and manage all family relationships
        </CardDescription>
      </CardHeader>
      <CardContent>
        {filteredRelations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery ? 'No relationships found matching your search.' : 'No relationships found.'}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>From Member</TableHead>
                <TableHead>To Member</TableHead>
                <TableHead>Relationship Type</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRelations.map((relation) => (
                <TableRow key={relation.id}>
                  <TableCell>
                    <div className="font-medium">
                      {relation.fromMember 
                        ? `${relation.fromMember.firstName} ${relation.fromMember.lastName}`
                        : relation.fromMemberId}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {relation.toMember 
                        ? `${relation.toMember.firstName} ${relation.toMember.lastName}`
                        : relation.toMemberId}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {relation.relationType}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          aria-label={`Delete relationship ${relation.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Relationship</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this relationship? 
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onDelete(relation.id)}
                            className="bg-destructive text-destructive-foreground"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

