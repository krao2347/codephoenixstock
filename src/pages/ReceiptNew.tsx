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

interface ReceiptItem {
  product_id: string;
  location_id: string;
  quantity: number;
  notes: string;
}

export default function ReceiptNew() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [receiptNumber, setReceiptNumber] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ReceiptItem[]>([
    { product_id: "", location_id: "", quantity: 1, notes: "" },
  ]);

  useEffect(() => {
    fetchProducts();
    fetchWarehouses();
    generateReceiptNumber();
  }, []);

  useEffect(() => {
    if (warehouseId) {
      fetchLocations(warehouseId);
    }
  }, [warehouseId]);

  const fetchProducts = async () => {
    const { data } = await supabase.from("products").select("id, name, sku");
    setProducts(data || []);
  };

  const fetchWarehouses = async () => {
    const { data } = await supabase.from("warehouses").select("id, name");
    setWarehouses(data || []);
  };

  const fetchLocations = async (warehouse_id: string) => {
    const { data } = await supabase
      .from("locations")
      .select("id, name, warehouse_id")
      .eq("warehouse_id", warehouse_id);
    setLocations(data || []);
  };

  const generateReceiptNumber = () => {
    const timestamp = Date.now().toString().slice(-6);
    setReceiptNumber(`RCV-${timestamp}`);
  };

  const addItem = () => {
    setItems([...items, { product_id: "", location_id: "", quantity: 1, notes: "" }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof ReceiptItem, value: any) => {
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

      if (!warehouseId) {
        toast({
          title: "Error",
          description: "Please select a warehouse",
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

      // Create receipt
      const { data: receipt, error: receiptError } = await supabase
        .from("receipts")
        .insert({
          receipt_number: receiptNumber,
          warehouse_id: warehouseId,
          notes: notes || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (receiptError) throw receiptError;

      // Create receipt items and update stock
      for (const item of validItems) {
        const { error: itemError } = await supabase.from("receipt_items").insert({
          receipt_id: receipt.id,
          ...item,
          location_id: item.location_id || null,
        });

        if (itemError) throw itemError;

        // Update or create stock record
        let stockQuery = supabase
          .from("stock")
          .select("*")
          .eq("product_id", item.product_id)
          .eq("warehouse_id", warehouseId);
        
        if (item.location_id) {
          stockQuery = stockQuery.eq("location_id", item.location_id);
        } else {
          stockQuery = stockQuery.is("location_id", null);
        }
        
        const { data: existingStock } = await stockQuery.maybeSingle();

        if (existingStock) {
          await supabase
            .from("stock")
            .update({
              quantity: Number(existingStock.quantity) + Number(item.quantity),
            })
            .eq("id", existingStock.id);
        } else {
          await supabase.from("stock").insert({
            product_id: item.product_id,
            warehouse_id: warehouseId,
            location_id: item.location_id || null,
            quantity: item.quantity,
            reserved_quantity: 0,
            user_id: user.id,
          });
        }
      }

      toast({
        title: "Success",
        description: "Receipt created and stock updated",
      });

      navigate("/receipts");
    } catch (error) {
      console.error("Error creating receipt:", error);
      toast({
        title: "Error",
        description: "Failed to create receipt",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Receive Inventory</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Add purchased or received stock to your warehouse
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate("/receipts")}>
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Receipt Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="receiptNumber">Receipt Number</Label>
                <Input
                  id="receiptNumber"
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="warehouse">Warehouse</Label>
                <Select value={warehouseId} onValueChange={setWarehouseId} required>
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
              <CardTitle>Receipt Items</CardTitle>
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
                  <Label>Location (Optional)</Label>
                  <Select
                    value={item.location_id}
                    onValueChange={(value) => updateItem(index, "location_id", value)}
                    disabled={!warehouseId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((location) => (
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
          <Button type="button" variant="outline" onClick={() => navigate("/receipts")}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Receipt"}
          </Button>
        </div>
      </form>
    </div>
  );
}
