import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";

interface Product {
  id: string;
  name: string;
  sku: string;
}

interface Warehouse {
  id: string;
  name: string;
}

interface Location {
  id: string;
  name: string;
  warehouse_id: string;
}

interface TransferItem {
  product_id: string;
  from_location_id: string;
  to_location_id: string;
  quantity: number;
  notes: string;
}

export default function TransferNew() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [fromLocations, setFromLocations] = useState<Location[]>([]);
  const [toLocations, setToLocations] = useState<Location[]>([]);
  const [transferNumber, setTransferNumber] = useState("");
  const [fromWarehouseId, setFromWarehouseId] = useState("");
  const [toWarehouseId, setToWarehouseId] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<TransferItem[]>([
    { product_id: "", from_location_id: "", to_location_id: "", quantity: 1, notes: "" },
  ]);

  useEffect(() => {
    fetchProducts();
    fetchWarehouses();
    generateTransferNumber();
  }, []);

  useEffect(() => {
    if (fromWarehouseId) {
      fetchLocations(fromWarehouseId, "from");
    }
  }, [fromWarehouseId]);

  useEffect(() => {
    if (toWarehouseId) {
      fetchLocations(toWarehouseId, "to");
    }
  }, [toWarehouseId]);

  const fetchProducts = async () => {
    const { data } = await supabase.from("products").select("id, name, sku");
    setProducts(data || []);
  };

  const fetchWarehouses = async () => {
    const { data } = await supabase.from("warehouses").select("id, name");
    setWarehouses(data || []);
  };

  const fetchLocations = async (warehouse_id: string, type: "from" | "to") => {
    const { data } = await supabase
      .from("locations")
      .select("id, name, warehouse_id")
      .eq("warehouse_id", warehouse_id);
    if (type === "from") {
      setFromLocations(data || []);
    } else {
      setToLocations(data || []);
    }
  };

  const generateTransferNumber = () => {
    const timestamp = Date.now().toString().slice(-6);
    setTransferNumber(`TRF-${timestamp}`);
  };

  const addItem = () => {
    setItems([...items, { product_id: "", from_location_id: "", to_location_id: "", quantity: 1, notes: "" }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof TransferItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (!fromWarehouseId || !toWarehouseId) {
        toast({
          title: "Error",
          description: "Please select both warehouses",
          variant: "destructive",
        });
        return;
      }

      if (fromWarehouseId === toWarehouseId) {
        toast({
          title: "Error",
          description: "Source and destination warehouses must be different",
          variant: "destructive",
        });
        return;
      }

      const validItems = items.filter((item) => item.product_id && item.quantity > 0);
      if (validItems.length === 0) {
        toast({
          title: "Error",
          description: "Please add at least one valid item",
          variant: "destructive",
        });
        return;
      }

      // Create transfer
      const { data: transfer, error: transferError } = await supabase
        .from("transfers")
        .insert({
          transfer_number: transferNumber,
          from_warehouse_id: fromWarehouseId,
          to_warehouse_id: toWarehouseId,
          notes: notes || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (transferError) throw transferError;

      // Create transfer items
      const { error: itemsError } = await supabase.from("transfer_items").insert(
        validItems.map((item) => ({
          transfer_id: transfer.id,
          ...item,
          from_location_id: item.from_location_id || null,
          to_location_id: item.to_location_id || null,
        }))
      );

      if (itemsError) throw itemsError;

      toast({
        title: "Success",
        description: "Transfer created successfully",
      });

      navigate("/transfers");
    } catch (error) {
      console.error("Error creating transfer:", error);
      toast({
        title: "Error",
        description: "Failed to create transfer",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">New Transfer</h1>
        <Button variant="outline" onClick={() => navigate("/transfers")}>
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Transfer Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="transferNumber">Transfer Number</Label>
                <Input
                  id="transferNumber"
                  value={transferNumber}
                  onChange={(e) => setTransferNumber(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fromWarehouse">From Warehouse</Label>
                <Select value={fromWarehouseId} onValueChange={setFromWarehouseId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.id}>
                        {warehouse.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="toWarehouse">To Warehouse</Label>
                <Select value={toWarehouseId} onValueChange={setToWarehouseId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.id}>
                        {warehouse.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Transfer Items</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="flex gap-4 items-end">
                <div className="flex-1">
                  <Label>Product</Label>
                  <Select
                    value={item.product_id}
                    onValueChange={(value) => updateItem(index, "product_id", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} ({product.sku})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label>From Location</Label>
                  <Select
                    value={item.from_location_id}
                    onValueChange={(value) => updateItem(index, "from_location_id", value)}
                    disabled={!fromWarehouseId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {fromLocations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label>To Location</Label>
                  <Select
                    value={item.to_location_id}
                    onValueChange={(value) => updateItem(index, "to_location_id", value)}
                    disabled={!toWarehouseId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {toLocations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-24">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, "quantity", Number(e.target.value))}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(index)}
                  disabled={items.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate("/transfers")}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Transfer"}
          </Button>
        </div>
      </form>
    </div>
  );
}
