import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Package, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

interface Order {
  id: string;
  order_number: string;
  order_type: string;
  supplier_customer: string | null;
  order_date: string;
  expected_date: string | null;
  status: string;
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("order_date", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast({
        title: "Error",
        description: "Failed to load orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsCompleted = async (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click navigation
    
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: "completed" })
        .eq("id", orderId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Order marked as completed",
      });
      
      fetchOrders(); // Refresh the list
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update order status",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500";
      case "confirmed":
        return "bg-blue-500";
      case "pending":
        return "bg-yellow-500";
      case "cancelled":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg">Loading orders...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Orders
          </h1>
          <p className="text-lg text-muted-foreground">Manage purchase and sales orders</p>
        </div>
        <Button onClick={() => navigate("/orders/new")} size="lg" className="hover-lift group">
          <Plus className="mr-2 h-5 w-5 group-hover:rotate-90 transition-transform" />
          New Order
        </Button>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-20 bg-gradient-to-br from-card via-card to-muted/20 rounded-xl border-2 border-dashed animate-scale-in">
          <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-xl text-muted-foreground mb-6">No orders yet</p>
          <Button onClick={() => navigate("/orders/new")} size="lg" className="hover-lift">
            <Plus className="mr-2 h-5 w-5" />
            Create First Order
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 animate-fade-in-up">
          {orders.map((order, index) => (
            <Card
              key={order.id}
              className="cursor-pointer hover-lift group transition-all hover:border-primary/50"
              onClick={() => navigate(`/orders/${order.id}`)}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <CardTitle className="text-2xl group-hover:text-primary transition-colors">
                      {order.order_number}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="hover-scale">
                        {order.order_type === "purchase" ? "Purchase Order" : "Sales Order"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(order.status)}>
                      {order.status}
                    </Badge>
                    {order.status === "pending" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="hover:bg-green-500/10 hover:text-green-600 hover:border-green-500"
                        onClick={(e) => markAsCompleted(order.id, e)}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Mark Completed
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                  {order.supplier_customer && (
                    <div className="space-y-1">
                      <span className="text-muted-foreground font-medium">
                        {order.order_type === "purchase" ? "Supplier" : "Customer"}
                      </span>
                      <p className="font-semibold">{order.supplier_customer}</p>
                    </div>
                  )}
                  <div className="space-y-1">
                    <span className="text-muted-foreground font-medium">Order Date</span>
                    <p className="font-semibold">
                      {new Date(order.order_date).toLocaleDateString()}
                    </p>
                  </div>
                  {order.expected_date && (
                    <div className="space-y-1">
                      <span className="text-muted-foreground font-medium">Expected Date</span>
                      <p className="font-semibold">
                        {new Date(order.expected_date).toLocaleDateString()}
                      </p>
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
