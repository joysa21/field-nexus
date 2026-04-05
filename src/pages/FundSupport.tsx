import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { DollarSign, Heart } from "lucide-react";

type NgoProfile = {
  id: string;
  ngo_name: string;
  description: string | null;
  sector: string | null;
  location: string | null;
};

type NgoBankDetails = {
  bankName: string;
  accountName: string;
  accountNumber: string;
  ifsc: string;
  branch: string;
  upiId: string;
};

const paymentMethods = [
  { value: "credit_card", label: "Credit Card" },
  { value: "paypal", label: "PayPal" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "upi", label: "UPI" },
];

const ngoBankDetails: Record<string, NgoBankDetails> = {
  "dummy-1": {
    bankName: "State Bank of India",
    accountName: "Helping Hands Foundation",
    accountNumber: "12345678901",
    ifsc: "SBIN0001234",
    branch: "Andheri West",
    upiId: "helpinghands@sbi",
  },
  "dummy-2": {
    bankName: "HDFC Bank",
    accountName: "Green Earth Initiative",
    accountNumber: "98765432109",
    ifsc: "HDFC0004567",
    branch: "Connaught Place",
    upiId: "greenearth@hdfc",
  },
  "dummy-3": {
    bankName: "ICICI Bank",
    accountName: "Women Empowerment Network",
    accountNumber: "11223344556",
    ifsc: "ICIC0007890",
    branch: "Whitefield",
    upiId: "womenempower@icici",
  },
  "dummy-4": {
    bankName: "Axis Bank",
    accountName: "Rural Development Trust",
    accountNumber: "55667788990",
    ifsc: "UTIB0001112",
    branch: "Anna Nagar",
    upiId: "ruraldev@axis",
  },
};

export default function FundSupport() {
  const [searchParams] = useSearchParams();
  const [ngos, setNgos] = useState<NgoProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNgo, setSelectedNgo] = useState<string>("");
  const [helpNgoName, setHelpNgoName] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [gatewayOpen, setGatewayOpen] = useState(false);
  const [gatewayProcessing, setGatewayProcessing] = useState(false);
  const [gatewayDetails, setGatewayDetails] = useState({
    cardNumber: "",
    expiry: "",
    cvv: "",
    nameOnCard: "",
    paypalEmail: "",
    bankReference: "",
    upiId: "",
  });

  useEffect(() => {
    const fetchNgos = async () => {
      try {
        const { data, error } = await supabase
          .from('ngo_profiles')
          .select('id, ngo_name, description, sector, location')
          .eq('verification_status', 'verified');

        if (error) throw error;

        // Add dummy NGOs for testing
        const dummyNgos: NgoProfile[] = [
          {
            id: "dummy-1",
            ngo_name: "Helping Hands Foundation",
            description: "Providing education and healthcare to underprivileged children",
            sector: "Education",
            location: "Mumbai, Maharashtra"
          },
          {
            id: "dummy-2",
            ngo_name: "Green Earth Initiative",
            description: "Environmental conservation and sustainable development",
            sector: "Environment",
            location: "Delhi, India"
          },
          {
            id: "dummy-3",
            ngo_name: "Women Empowerment Network",
            description: "Supporting women's rights and economic independence",
            sector: "Social Welfare",
            location: "Bangalore, Karnataka"
          },
          {
            id: "dummy-4",
            ngo_name: "Rural Development Trust",
            description: "Improving infrastructure and livelihood in rural areas",
            sector: "Rural Development",
            location: "Chennai, Tamil Nadu"
          }
        ];

        setNgos([...(data || []), ...dummyNgos]);
      } catch (error) {
        console.error('Error fetching NGOs:', error);
        toast.error("Failed to load NGOs");
        // Still show dummy data on error
        const dummyNgos: NgoProfile[] = [
          {
            id: "dummy-1",
            ngo_name: "Helping Hands Foundation",
            description: "Providing education and healthcare to underprivileged children",
            sector: "Education",
            location: "Mumbai, Maharashtra"
          },
          {
            id: "dummy-2",
            ngo_name: "Green Earth Initiative",
            description: "Environmental conservation and sustainable development",
            sector: "Environment",
            location: "Delhi, India"
          },
          {
            id: "dummy-3",
            ngo_name: "Women Empowerment Network",
            description: "Supporting women's rights and economic independence",
            sector: "Social Welfare",
            location: "Bangalore, Karnataka"
          },
          {
            id: "dummy-4",
            ngo_name: "Rural Development Trust",
            description: "Improving infrastructure and livelihood in rural areas",
            sector: "Rural Development",
            location: "Chennai, Tamil Nadu"
          }
        ];
        setNgos(dummyNgos);
      } finally {
        setLoading(false);
      }
    };

    fetchNgos();
  }, []);

  useEffect(() => {
    const help = searchParams.get("help") === "true";
    const ngoName = searchParams.get("ngoName") ?? "";

    if (ngoName) {
      setHelpNgoName(ngoName);
    }

    if (help) {
      setAmount("500");
      setPaymentMethod("upi");
      setGatewayOpen(true);
    }
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedNgo || !amount || !paymentMethod) {
      toast.error("Please fill in all fields");
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setGatewayOpen(true);
  };

  const resetGateway = () => {
    setGatewayDetails({
      cardNumber: "",
      expiry: "",
      cvv: "",
      nameOnCard: "",
      paypalEmail: "",
      bankReference: "",
      upiId: "",
    });
    setGatewayProcessing(false);
    setGatewayOpen(false);
  };

  const handleGatewaySubmit = async () => {
    const amountNum = parseFloat(amount);

    if (paymentMethod === "credit_card") {
      const { cardNumber, expiry, cvv, nameOnCard } = gatewayDetails;
      if (!cardNumber || !expiry || !cvv || !nameOnCard) {
        toast.error("Please complete all credit card fields.");
        return;
      }
    }

    if (paymentMethod === "paypal" && !gatewayDetails.paypalEmail) {
      toast.error("Please enter your PayPal email.");
      return;
    }

    if (paymentMethod === "bank_transfer" && !gatewayDetails.bankReference) {
      toast.error("Please enter the bank transaction reference.");
      return;
    }

    if (paymentMethod === "upi" && !gatewayDetails.upiId) {
      toast.error("Please enter your UPI ID.");
      return;
    }

    setGatewayProcessing(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      toast.success(`Payment successful! Rs ${amountNum} donated to ${ngos.find((ngo) => ngo.id === selectedNgo)?.ngo_name}.`);
      setSelectedNgo("");
      setAmount("");
      setPaymentMethod("");
      resetGateway();
    } catch (error) {
      toast.error("Payment failed. Please try again.");
      setGatewayProcessing(false);
    }
  };

  const selectedNgoName = ngos.find((ngo) => ngo.id === selectedNgo)?.ngo_name ?? (helpNgoName || "the selected NGO");
  const selectedMethodLabel = paymentMethods.find((method) => method.value === paymentMethod)?.label ?? "payment";
  const selectedBankDetails = ngoBankDetails[selectedNgo] ?? {
    bankName: "Not available",
    accountName: selectedNgoName,
    accountNumber: "XXXX-XXXX-XXXX",
    ifsc: "XXXX0000000",
    branch: "N/A",
    upiId: helpNgoName ? `${helpNgoName.replace(/\s+/g, "").toLowerCase()}@upi` : "not-available@upi",
  };


  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Heart className="w-8 h-8 text-red-500" />
          <h1 className="text-3xl font-bold">Fund Support</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Make a Donation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="ngo">Select NGO</Label>
                <Select value={selectedNgo} onValueChange={setSelectedNgo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an NGO to support" />
                  </SelectTrigger>
                  <SelectContent>
                    {ngos.map((ngo) => (
                      <SelectItem key={ngo.id} value={ngo.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{ngo.ngo_name}</span>
                          {ngo.location && (
                            <span className="text-sm text-muted-foreground">{ngo.location}</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Donation Amount (Rs)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="Enter amount in Rupees"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="submit"
                className="w-full"
              >
                Donate Now
              </Button>
            </form>
          </CardContent>
        </Card>

        <Dialog open={gatewayOpen} onOpenChange={(open) => { if (!open) resetGateway(); else setGatewayOpen(open); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Payment Gateway</DialogTitle>
              <DialogDescription>
                You are paying Rs {amount || "0"} to {selectedNgoName} using {selectedMethodLabel}. Fill in the gateway details to complete your payment.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <div className="rounded-lg border border-border bg-muted p-4 text-sm text-muted-foreground">
                This is a simulated payment gateway flow. In a production integration, you would be redirected to the selected payment provider.
              </div>

              <div className="rounded-lg border border-border bg-background p-4">
                <p className="text-sm font-semibold">Receiver bank details</p>
                <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                  <div className="flex justify-between"><span>Account name</span><span className="font-medium text-foreground">{selectedBankDetails.accountName}</span></div>
                  <div className="flex justify-between"><span>Bank name</span><span className="font-medium text-foreground">{selectedBankDetails.bankName}</span></div>
                  <div className="flex justify-between"><span>Account number</span><span className="font-medium text-foreground">{selectedBankDetails.accountNumber}</span></div>
                  <div className="flex justify-between"><span>IFSC</span><span className="font-medium text-foreground">{selectedBankDetails.ifsc}</span></div>
                  <div className="flex justify-between"><span>Branch</span><span className="font-medium text-foreground">{selectedBankDetails.branch}</span></div>
                  <div className="flex justify-between"><span>UPI ID</span><span className="font-medium text-foreground">{selectedBankDetails.upiId}</span></div>
                </div>
              </div>

              {paymentMethod === "credit_card" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nameOnCard">Name on card</Label>
                    <Input
                      id="nameOnCard"
                      placeholder="Cardholder name"
                      value={gatewayDetails.nameOnCard}
                      onChange={(e) => setGatewayDetails({ ...gatewayDetails, nameOnCard: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cardNumber">Card number</Label>
                    <Input
                      id="cardNumber"
                      placeholder="XXXX XXXX XXXX XXXX"
                      value={gatewayDetails.cardNumber}
                      onChange={(e) => setGatewayDetails({ ...gatewayDetails, cardNumber: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expiry">Expiry</Label>
                      <Input
                        id="expiry"
                        placeholder="MM/YY"
                        value={gatewayDetails.expiry}
                        onChange={(e) => setGatewayDetails({ ...gatewayDetails, expiry: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cvv">CVV</Label>
                      <Input
                        id="cvv"
                        placeholder="123"
                        value={gatewayDetails.cvv}
                        onChange={(e) => setGatewayDetails({ ...gatewayDetails, cvv: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {paymentMethod === "paypal" && (
                <div className="space-y-2">
                  <Label htmlFor="paypalEmail">PayPal email</Label>
                  <Input
                    id="paypalEmail"
                    type="email"
                    placeholder="you@example.com"
                    value={gatewayDetails.paypalEmail}
                    onChange={(e) => setGatewayDetails({ ...gatewayDetails, paypalEmail: e.target.value })}
                  />
                </div>
              )}

              {paymentMethod === "bank_transfer" && (
                <div className="space-y-2">
                  <Label htmlFor="bankReference">Bank transaction reference</Label>
                  <Input
                    id="bankReference"
                    placeholder="Enter transaction reference"
                    value={gatewayDetails.bankReference}
                    onChange={(e) => setGatewayDetails({ ...gatewayDetails, bankReference: e.target.value })}
                  />
                </div>
              )}

              {paymentMethod === "upi" && (
                <div className="space-y-2">
                  <Label htmlFor="upiId">UPI ID</Label>
                  <Input
                    id="upiId"
                    placeholder="example@upi"
                    value={gatewayDetails.upiId}
                    onChange={(e) => setGatewayDetails({ ...gatewayDetails, upiId: e.target.value })}
                  />
                </div>
              )}
            </div>

            <DialogFooter className="mt-6 gap-2">
              <Button variant="outline" onClick={() => setGatewayOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleGatewaySubmit} disabled={gatewayProcessing}>
                {gatewayProcessing ? "Processing payment..." : `Pay with ${selectedMethodLabel}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {ngos.length === 0 && (
          <Card className="mt-6">
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                No verified NGOs available at the moment.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}