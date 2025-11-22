import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface StockItem {
  id: string;
  quantity: number;
  available_quantity: number;
  reserved_quantity: number;
  product: {
    name: string;
    sku: string;
    reorder_level: number;
  };
  warehouse: {
    name: string;
    short_code: string;
  };
  location: {
    name: string;
  } | null;
}

export default function Stock() {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStock();
  }, []);

  const fetchStock = async () => {
    try {
      const { data, error } = await supabase
        .from("stock")
        .select(`
          id,
          quantity,
          available_quantity,
          reserved_quantity,
          product:products(name, sku, reorder_level),
          warehouse:warehouses(name, short_code),
          location:locations(name)
        `)
        .order("quantity", { ascending: true });

      if (error) throw error;
      setStock(data || []);
    } catch (error) {
      console.error("Error fetching stock:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading stock...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Stock Levels</h1>
        <p className="text-muted-foreground">View current stock across all warehouses</p>
      </div>

      {stock.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-lg border">
          <p className="text-muted-foreground">No stock records found</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead className="text-right">Reserved</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stock.map((item) => {
                const product = item.product as any;
                const warehouse = item.warehouse as any;
                const location = item.location as any;
                const isLowStock = Number(item.quantity) <= Number(product?.reorder_level || 0);

                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono">{product?.sku}</TableCell>
                    <TableCell className="font-medium">{product?.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{warehouse?.short_code}</Badge> {warehouse?.name}
                    </TableCell>
                    <TableCell>{location?.name || "-"}</TableCell>
                    <TableCell className="text-right font-semibold">{item.quantity}</TableCell>
                    <TableCell className="text-right">{item.available_quantity}</TableCell>
                    <TableCell className="text-right">{item.reserved_quantity}</TableCell>
                    <TableCell>
                      {isLowStock ? (
                        <Badge variant="destructive">Low Stock</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-success/10 text-success border-success">
                          In Stock
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
