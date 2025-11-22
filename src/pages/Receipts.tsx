import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

interface Receipt {
  id: string;
  receipt_number: string;
  receipt_date: string;
  notes: string | null;
  warehouses: { name: string } | null;
}

export default function Receipts() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchReceipts();
  }, []);

  const fetchReceipts = async () => {
    try {
      const { data, error } = await supabase
        .from("receipts")
        .select("*, warehouses(name)")
        .order("receipt_date", { ascending: false });

      if (error) throw error;
      setReceipts(data || []);
    } catch (error) {
      console.error("Error fetching receipts:", error);
      toast({
        title: "Error",
        description: "Failed to load receipts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg">Loading receipts...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Receipts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Receive inventory and increase stock levels
          </p>
        </div>
        <Button onClick={() => navigate("/receipts/new")}>
          <Plus className="mr-2 h-4 w-4" />
          Receive Inventory
        </Button>
      </div>

      {receipts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No receipts yet</p>
            <Button onClick={() => navigate("/receipts/new")}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Receipt
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {receipts.map((receipt) => (
            <Card
              key={receipt.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/receipts/${receipt.id}`)}
            >
              <CardHeader>
                <CardTitle>{receipt.receipt_number}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Warehouse: </span>
                    <span className="font-medium">
                      {receipt.warehouses?.name || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Date: </span>
                    <span className="font-medium">
                      {new Date(receipt.receipt_date).toLocaleDateString()}
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
