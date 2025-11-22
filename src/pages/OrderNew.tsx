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
import { getCurrencySymbol } from "@/lib/currency";

interface Product {
  id: string;
  name: string;
  sku: string;
  selling_price: number | null;
}

interface Warehouse {
  id: string;
  name: string;
}

interface OrderItem {
  product_id: string;
  quantity: number;
  unit_price: number;
  notes: string;
}

interface StockInfo {
  product_id: string;
  available: number;
  total: number;
}

export default function OrderNew() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [stockInfo, setStockInfo] = useState<Record<string, StockInfo>>({});
  const [orderNumber, setOrderNumber] = useState("");
  const [orderType, setOrderType] = useState<"purchase" | "sales">("purchase");
  const [warehouseId, setWarehouseId] = useState("");
  const [supplierCustomer, setSupplierCustomer] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<OrderItem[]>([
    { product_id: "", quantity: 1, unit_price: 0, notes: "" },
  ]);

  useEffect(() => {
    fetchProducts();
    fetchWarehouses();
    generateOrderNumber();
  }, []);

  useEffect(() => {
    if (warehouseId && orderType === "sales") {
      fetchStockInfo();
    }
  }, [warehouseId, orderType]);

  const fetchStockInfo = async () => {
    if (!warehouseId) return;
    
    const { data: stockData } = await supabase
      .from("stock")
      .select("product_id, quantity, available_quantity")
      .eq("warehouse_id", warehouseId);

    if (stockData) {
      const stockMap: Record<string, StockInfo> = {};
      stockData.forEach((stock) => {
        if (!stockMap[stock.product_id]) {
          stockMap[stock.product_id] = {
            product_id: stock.product_id,
            available: 0,
            total: 0,
          };
        }
        stockMap[stock.product_id].total += Number(stock.quantity);
        stockMap[stock.product_id].available += Number(stock.available_quantity || stock.quantity);
      });
      setStockInfo(stockMap);
    }
  };

  const fetchProducts = async () => {
    const { data } = await supabase.from("products").select("id, name, sku, selling_price");
    setProducts(data || []);
  };

  const fetchWarehouses = async () => {
    const { data } = await supabase.from("warehouses").select("id, name");
    setWarehouses(data || []);
  };

  const generateOrderNumber = () => {
    const timestamp = Date.now().toString().slice(-6);
    setOrderNumber(`ORD-${timestamp}`);
  };

  const addItem = () => {
    setItems([...items, { product_id: "", quantity: 1, unit_price: 0, notes: "" }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof OrderItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Auto-fill price when product is selected
    if (field === "product_id" && value) {
      const product = products.find((p) => p.id === value);
      if (product?.selling_price) {
        newItems[index].unit_price = product.selling_price;
      }
    }
    
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Validate items
      const validItems = items.filter((item) => item.product_id && item.quantity > 0);
      if (validItems.length === 0) {
        toast({
          title: "Error",
          description: "Please add at least one valid item",
          variant: "destructive",
        });
        return;
      }

      // Validate warehouse selection for sales orders
      if (orderType === "sales" && !warehouseId) {
        toast({
          title: "Error",
          description: "Please select a warehouse for stock deduction",
          variant: "destructive",
        });
        return;
      }

      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          order_number: orderNumber,
          order_type: orderType,
          supplier_customer: supplierCustomer || null,
          expected_date: expectedDate || null,
          notes: notes || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const { error: itemsError } = await supabase.from("order_items").insert(
        validItems.map((item) => ({
          order_id: order.id,
          ...item,
        }))
      );

      if (itemsError) throw itemsError;

      // If this is a sales order, decrease stock from selected warehouse
      if (orderType === "sales" && warehouseId) {
        for (const item of validItems) {
          // Get current stock for the selected warehouse
          const { data: stockRecords } = await supabase
            .from("stock")
            .select("*")
            .eq("product_id", item.product_id)
            .eq("warehouse_id", warehouseId);

          if (!stockRecords || stockRecords.length === 0) {
            const product = products.find(p => p.id === item.product_id);
            throw new Error(`No stock available for ${product?.name || 'product'} in selected warehouse`);
          }

          // Calculate total available quantity in this warehouse
          const totalAvailable = stockRecords.reduce((sum, stock) => {
            return sum + (stock.available_quantity || stock.quantity);
          }, 0);

          if (totalAvailable < item.quantity) {
            const product = products.find(p => p.id === item.product_id);
            throw new Error(`Insufficient stock for ${product?.name || 'product'}. Available: ${totalAvailable}, Required: ${item.quantity}`);
          }

          let remainingQty = item.quantity;
          
          // Deduct stock from the selected warehouse
          for (const stock of stockRecords) {
            if (remainingQty <= 0) break;
            
            const availableQty = stock.available_quantity || stock.quantity;
            const deductQty = Math.min(remainingQty, availableQty);
            
            if (deductQty > 0) {
              await supabase
                .from("stock")
                .update({
                  quantity: Number(stock.quantity) - deductQty,
                })
                .eq("id", stock.id);
              
              remainingQty -= deductQty;
            }
          }
        }
      }

      toast({
        title: "Success",
        description: orderType === "sales" 
          ? "Sales order created and stock updated"
          : "Purchase order created successfully",
      });

      navigate("/orders");
    } catch (error) {
      console.error("Error creating order:", error);
      toast({
        title: "Error",
        description: "Failed to create order",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">New Order</h1>
        <Button variant="outline" onClick={() => navigate("/orders")}>
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="orderNumber">Order Number</Label>
                <Input
                  id="orderNumber"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="orderType">Order Type</Label>
                <Select value={orderType} onValueChange={(value: any) => setOrderType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="purchase">Purchase Order</SelectItem>
                    <SelectItem value="sales">Sales Order</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {orderType === "sales" && (
              <div>
                <Label htmlFor="warehouse">
                  Warehouse <span className="text-destructive">*</span>
                </Label>
                <Select value={warehouseId} onValueChange={setWarehouseId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select warehouse for stock deduction" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.id}>
                        {warehouse.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Stock will be deducted from this warehouse
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="supplierCustomer">
                  {orderType === "purchase" ? "Supplier" : "Customer"}
                </Label>
                <Input
                  id="supplierCustomer"
                  value={supplierCustomer}
                  onChange={(e) => setSupplierCustomer(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="expectedDate">Expected Date</Label>
                <Input
                  id="expectedDate"
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                />
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
              <CardTitle>Order Items</CardTitle>
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
                          {orderType === "sales" && warehouseId && stockInfo[product.id] && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              • Stock: {stockInfo[product.id].available}
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {orderType === "sales" && item.product_id && warehouseId && stockInfo[item.product_id] && (
                    <p className="text-xs mt-1">
                      <span className={stockInfo[item.product_id].available >= item.quantity ? "text-green-600" : "text-destructive"}>
                        Available: {stockInfo[item.product_id].available} units
                      </span>
                      {stockInfo[item.product_id].available < item.quantity && (
                        <span className="text-destructive ml-1">
                          (Insufficient stock)
                        </span>
                      )}
                    </p>
                  )}
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
                <div className="w-32">
                  <Label>Unit Price ({getCurrencySymbol()})</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unit_price}
                    onChange={(e) => updateItem(index, "unit_price", Number(e.target.value))}
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
          <Button type="button" variant="outline" onClick={() => navigate("/orders")}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Order"}
          </Button>
        </div>
      </form>
    </div>
  );
}
