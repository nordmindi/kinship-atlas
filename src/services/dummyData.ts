
import { FamilyMember } from "@/types";

export const dummyFamilyMembers: FamilyMember[] = [
  {
    id: "1",
    firstName: "John",
    lastName: "Smith",
    birthDate: "1950-05-15",
    gender: "male",
    relations: [
      { id: "101", type: "child", personId: "2" },
      { id: "102", type: "child", personId: "3" },
      { id: "103", type: "spouse", personId: "4" }
    ],
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=John"
  },
  {
    id: "2",
    firstName: "Michael",
    lastName: "Smith",
    birthDate: "1975-08-22",
    gender: "male",
    relations: [
      { id: "104", type: "parent", personId: "1" },
      { id: "105", type: "spouse", personId: "5" }
    ],
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Michael"
  },
  {
    id: "3",
    firstName: "Sarah",
    lastName: "Johnson",
    birthDate: "1978-11-30",
    gender: "female",
    relations: [
      { id: "106", type: "parent", personId: "1" },
      { id: "107", type: "spouse", personId: "6" }
    ],
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah"
  },
  {
    id: "4",
    firstName: "Emily",
    lastName: "Smith",
    birthDate: "1952-03-12",
    gender: "female",
    relations: [
      { id: "108", type: "spouse", personId: "1" }
    ],
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emily"
  },
  {
    id: "5",
    firstName: "Jessica",
    lastName: "Smith",
    birthDate: "1980-01-25",
    gender: "female",
    relations: [
      { id: "109", type: "parent", personId: "2" }
    ],
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jessica"
  },
  {
    id: "6",
    firstName: "David",
    lastName: "Johnson",
    birthDate: "1976-07-18",
    gender: "male",
    relations: [
      { id: "110", type: "parent", personId: "3" },
      { id: "111", type: "spouse", personId: "3" }
    ],
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=David"
  },
  {
    id: "7",
    firstName: "Emma",
    lastName: "Smith",
    birthDate: "2000-12-05",
    gender: "female",
    relations: [
      { id: "112", type: "child", personId: "2" },
      { id: "113", type: "child", personId: "5" }
    ],
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma"
  }
];
