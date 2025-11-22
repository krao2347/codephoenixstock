import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

interface Transfer {
  id: string;
  transfer_number: string;
  transfer_date: string;
  status: string;
  from_warehouse: { name: string } | null;
  to_warehouse: { name: string } | null;
}

export default function Transfers() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTransfers();
  }, []);

  const fetchTransfers = async () => {
    try {
      const { data, error } = await supabase
        .from("transfers")
        .select(`
          *,
          from_warehouse:warehouses!transfers_from_warehouse_id_fkey(name),
          to_warehouse:warehouses!transfers_to_warehouse_id_fkey(name)
        `)
        .order("transfer_date", { ascending: false });

      if (error) throw error;
      setTransfers(data || []);
    } catch (error) {
      console.error("Error fetching transfers:", error);
      toast({
        title: "Error",
        description: "Failed to load transfers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500";
      case "in_transit":
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
        <div className="text-lg">Loading transfers...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Internal Transfers</h1>
        <Button onClick={() => navigate("/transfers/new")}>
          <Plus className="mr-2 h-4 w-4" />
          New Transfer
        </Button>
      </div>

      {transfers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No transfers yet</p>
            <Button onClick={() => navigate("/transfers/new")}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Transfer
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {transfers.map((transfer) => (
            <Card
              key={transfer.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/transfers/${transfer.id}`)}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle>{transfer.transfer_number}</CardTitle>
                  <Badge className={getStatusColor(transfer.status)}>
                    {transfer.status.replace("_", " ")}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">From: </span>
                    <span className="font-medium">
                      {transfer.from_warehouse?.name || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">To: </span>
                    <span className="font-medium">
                      {transfer.to_warehouse?.name || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Date: </span>
                    <span className="font-medium">
                      {new Date(transfer.transfer_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
