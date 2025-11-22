import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Warehouse as WarehouseIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Warehouse {
  id: string;
  name: string;
  short_code: string;
  address: string;
}

export default function Warehouses() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    short_code: "",
    address: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    try {
      const { data, error } = await supabase
        .from("warehouses")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setWarehouses(data || []);
    } catch (error) {
      console.error("Error fetching warehouses:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.short_code) {
      toast({
        title: "Error",
        description: "Name and short code are required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from("warehouses").insert(formData);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Warehouse created successfully",
      });
      
      setFormData({ name: "", short_code: "", address: "" });
      setOpen(false);
      fetchWarehouses();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create warehouse",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading warehouses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Warehouses</h1>
          <p className="text-muted-foreground">Manage your warehouse locations</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Warehouse
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Warehouse</DialogTitle>
              <DialogDescription>Add a new warehouse location to your system</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Warehouse Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Main Warehouse"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="short_code">Short Code *</Label>
                <Input
                  id="short_code"
                  value={formData.short_code}
                  onChange={(e) => setFormData({ ...formData, short_code: e.target.value.toUpperCase() })}
                  placeholder="e.g., WH01"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Enter warehouse address"
                />
              </div>
              <Button type="submit">Create Warehouse</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {warehouses.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-lg border">
          <WarehouseIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">No warehouses found</p>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create your first warehouse
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Warehouse</DialogTitle>
                <DialogDescription>Add a new warehouse location to your system</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Warehouse Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Main Warehouse"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="short_code">Short Code *</Label>
                  <Input
                    id="short_code"
                    value={formData.short_code}
                    onChange={(e) => setFormData({ ...formData, short_code: e.target.value.toUpperCase() })}
                    placeholder="e.g., WH01"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Enter warehouse address"
                  />
                </div>
                <Button type="submit">Create Warehouse</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {warehouses.map((warehouse) => (
            <Card key={warehouse.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <WarehouseIcon className="h-5 w-5 text-primary" />
                  {warehouse.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Code:</span>
                    <span className="font-mono font-semibold">{warehouse.short_code}</span>
                  </div>
                  {warehouse.address && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Address:</span>
                      <span className="text-right">{warehouse.address}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
