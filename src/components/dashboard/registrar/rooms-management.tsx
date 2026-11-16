"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Badge } from "../../ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { Search, Plus, Edit, Trash2, DoorOpen, Building, Users } from "lucide-react";
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy } from "firebase/firestore";
import { db, auth } from "../../../lib/firebase";
import { toast } from "sonner@2.0.3";
import { LoadingState } from "../../loading-state";
import { EmptyState } from "../../empty-state";
import { PageHeader } from "../shared/page-header";

interface Room {
  id: string;
  roomNumber: string;
  roomName: string;
  capacity: number;
  building: string;
  facilities: string;
  createdBy: string;
  createdAt: any;
  updatedAt: any;
}

export function RoomsManagement() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBuilding, setSelectedBuilding] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [processing, setProcessing] = useState(false);

  // Form state
  const [roomNumber, setRoomNumber] = useState("");
  const [roomName, setRoomName] = useState("");
  const [capacity, setCapacity] = useState("");
  const [building, setBuilding] = useState("");
  const [facilities, setFacilities] = useState("");

  // Load rooms
  useEffect(() => {
    const q = query(
      collection(db, "rooms"),
      orderBy("building", "asc"),
      orderBy("roomNumber", "asc")
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const roomsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Room[];
      setRooms(roomsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching rooms:", error);
      toast.error("Failed to load rooms");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const resetForm = () => {
    setRoomNumber("");
    setRoomName("");
    setCapacity("");
    setBuilding("");
    setFacilities("");
    setEditingRoom(null);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (room: Room) => {
    setEditingRoom(room);
    setRoomNumber(room.roomNumber);
    setRoomName(room.roomName);
    setCapacity(room.capacity.toString());
    setBuilding(room.building);
    setFacilities(room.facilities || "");
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!roomNumber || !roomName || !capacity || !building) {
      toast.error("Please fill in all required fields");
      return;
    }

    const capacityNum = parseInt(capacity);
    if (isNaN(capacityNum) || capacityNum <= 0) {
      toast.error("Capacity must be a positive number");
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      toast.error("You must be logged in");
      return;
    }

    setProcessing(true);

    try {
      const roomData = {
        roomNumber,
        roomName,
        capacity: capacityNum,
        building,
        facilities: facilities || "",
        updatedAt: serverTimestamp(),
      };

      if (editingRoom) {
        // Update existing room
        await updateDoc(doc(db, "rooms", editingRoom.id), roomData);
        toast.success("Room updated successfully!");
      } else {
        // Create new room
        await addDoc(collection(db, "rooms"), {
          ...roomData,
          createdBy: currentUser.email,
          createdAt: serverTimestamp(),
        });
        toast.success("Room created successfully!");
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error("Error saving room:", error);
      toast.error(`Failed to save room: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (room: Room) => {
    if (!confirm(`Are you sure you want to delete ${room.roomNumber} - ${room.roomName}?`)) {
      return;
    }

    setProcessing(true);

    try {
      await deleteDoc(doc(db, "rooms", room.id));
      toast.success("Room deleted successfully!");
    } catch (error: any) {
      console.error("Error deleting room:", error);
      toast.error(`Failed to delete room: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const existingBuildings = Array.from(
    new Set(rooms.map(room => (room.building || "").trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const normalizedSelectedBuilding = selectedBuilding.trim().toLowerCase();
  const filteredRooms = rooms.filter((room) => {
    const roomNumber = (room.roomNumber || "").toLowerCase();
    const roomName = (room.roomName || "").toLowerCase();
    const roomBuilding = (room.building || "").trim();
    const matchesSearch = !normalizedSearch ||
      roomNumber.includes(normalizedSearch) ||
      roomName.includes(normalizedSearch) ||
      roomBuilding.toLowerCase().includes(normalizedSearch);
    const matchesBuilding = selectedBuilding === "all" ||
      roomBuilding.toLowerCase() === normalizedSelectedBuilding;
    return matchesSearch && matchesBuilding;
  });
  const hasRoomFilters = Boolean(normalizedSearch) || selectedBuilding !== "all";

  // Group rooms by building
  const roomsByBuilding = filteredRooms.reduce((acc, room) => {
    if (!acc[room.building]) {
      acc[room.building] = [];
    }
    acc[room.building].push(room);
    return acc;
  }, {} as Record<string, Room[]>);

  const buildings = Object.keys(roomsByBuilding).sort();

  if (loading) {
    return <LoadingState message="Loading rooms..." />;
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        icon={Building}
        title="Room Management"
        description="Manage classroom and laboratory facilities"
        action={
          <Button onClick={openAddDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Add Room
          </Button>
        }
      />

      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-6">

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <DoorOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{rooms.length}</div>
                <div className="text-sm text-muted-foreground">Total Rooms</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Building className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{existingBuildings.length}</div>
                <div className="text-sm text-muted-foreground">Buildings</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {rooms.reduce((sum, room) => sum + room.capacity, 0)}
                </div>
                <div className="text-sm text-muted-foreground">Total Capacity</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader className="gap-1">
          <CardTitle>Rooms</CardTitle>
          <CardDescription>
            Search, filter, and manage classrooms and laboratories.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_220px_auto]">
            <div className="space-y-1">
              <Label htmlFor="room-search">Search rooms</Label>
              <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="room-search"
                aria-label="Search rooms"
                placeholder="Search by room number, name, or building..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="building-filter">Filter by building</Label>
              <select
                id="building-filter"
                value={selectedBuilding}
                onChange={(e) => setSelectedBuilding(e.target.value)}
                className="h-11 w-full rounded-lg border-2 border-border bg-input-background px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/20"
              >
                <option value="all">All buildings</option>
                {existingBuildings.map((buildingName) => (
                  <option key={buildingName} value={buildingName}>
                    {buildingName}
                  </option>
                ))}
              </select>
            </div>
            {hasRoomFilters && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedBuilding("all");
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            Showing {filteredRooms.length} of {rooms.length} rooms
            {selectedBuilding === "all" ? ` across ${buildings.length} buildings` : ""}
          </p>

          {/* Rooms by Building */}
          {filteredRooms.length === 0 ? (
            <EmptyState
              icon={DoorOpen}
              title="No rooms found"
              description={searchTerm 
                ? "Try adjusting your search" 
                : "Start by adding your first room"}
            />
          ) : (
            <div className="space-y-6">
              {buildings.map((buildingName) => (
                <div key={buildingName} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-medium">{buildingName}</h3>
                    <Badge variant="secondary">{roomsByBuilding[buildingName].length} rooms</Badge>
                  </div>
                  
                  <div className="overflow-x-auto rounded-lg border">
                    <Table className="min-w-[640px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Room Number</TableHead>
                          <TableHead>Room Name</TableHead>
                          <TableHead>Capacity</TableHead>
                          <TableHead>Facilities</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {roomsByBuilding[buildingName].map((room) => (
                          <TableRow key={room.id}>
                            <TableCell>
                              <div className="font-medium">{room.roomNumber}</div>
                            </TableCell>
                            <TableCell>{room.roomName}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Users className="h-3 w-3 text-muted-foreground" />
                                <span>{room.capacity} students</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {room.facilities ? (
                                <span className="text-sm text-muted-foreground">
                                  {room.facilities}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditDialog(room)}
                                  aria-label={`Edit ${room.roomNumber}`}
                                  title="Edit room"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(room)}
                                  disabled={processing}
                                  aria-label={`Delete ${room.roomNumber}`}
                                  title="Delete room"
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Room Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-h-[90vh] gap-0 overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editingRoom ? "Edit Room" : "Create New Room"}
            </DialogTitle>
            <DialogDescription>
              {editingRoom 
                ? "Update the room information below" 
                : "Add a new classroom or laboratory"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 px-6 py-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <Label htmlFor="roomNumber">Room Number *</Label>
                <Input
                  id="roomNumber"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  placeholder="e.g., 301"
                  className="mt-1 h-11"
                />
              </div>
              <div>
                <Label htmlFor="capacity">Capacity *</Label>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  placeholder="e.g., 40"
                  className="mt-1 h-11"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="roomName">Room Name *</Label>
              <Input
                id="roomName"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="e.g., Computer Laboratory 1"
                className="mt-1 h-11"
              />
            </div>

            <div>
              <Label htmlFor="building">Building *</Label>
              <Input
                id="building"
                list="existing-buildings"
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
                placeholder="e.g., Main Building, Engineering Building"
                className="mt-1 h-11"
              />
              <datalist id="existing-buildings">
                {existingBuildings.map((buildingName) => (
                  <option key={buildingName} value={buildingName} />
                ))}
              </datalist>
              <p className="text-xs text-muted-foreground mt-1">
                Choose an existing building or type a new one.
              </p>
            </div>

            <div>
              <Label htmlFor="facilities">Facilities (Optional)</Label>
              <Input
                id="facilities"
                value={facilities}
                onChange={(e) => setFacilities(e.target.value)}
                placeholder="e.g., Projector, Air-conditioned, Computers"
                className="mt-1 h-11"
              />
              <p className="text-xs text-muted-foreground mt-1">
                List available equipment and amenities
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={processing}>
              {editingRoom ? "Update Room" : "Create Room"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
