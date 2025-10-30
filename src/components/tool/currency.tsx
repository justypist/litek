import { useState, useEffect, type FC } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { toast } from "sonner";
import { Check, X, Plus } from "lucide-react";

interface Currency {
  code: string;
  name: string;
  symbol: string;
}

// Available currencies (supported by Frankfurter API)
const AVAILABLE_CURRENCIES: Currency[] = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF" },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$" },
  { code: "KRW", name: "South Korean Won", symbol: "₩" },
  { code: "THB", name: "Thai Baht", symbol: "฿" },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM" },
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$" },
  { code: "MXN", name: "Mexican Peso", symbol: "MX$" },
  { code: "SEK", name: "Swedish Krona", symbol: "kr" },
  { code: "NOK", name: "Norwegian Krone", symbol: "kr" },
  { code: "DKK", name: "Danish Krone", symbol: "kr" },
  { code: "PLN", name: "Polish Złoty", symbol: "zł" },
  { code: "TRY", name: "Turkish Lira", symbol: "₺" },
  { code: "PHP", name: "Philippine Peso", symbol: "₱" },
  { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp" },
  { code: "ILS", name: "Israeli New Shekel", symbol: "₪" },
  { code: "CZK", name: "Czech Koruna", symbol: "Kč" },
  { code: "RON", name: "Romanian Leu", symbol: "lei" },
  { code: "HUF", name: "Hungarian Forint", symbol: "Ft" },
  { code: "BGN", name: "Bulgarian Lev", symbol: "лв" },
  { code: "ISK", name: "Icelandic Króna", symbol: "kr" },
];

// Required currencies (cannot be removed) - USD first, CNY second
const REQUIRED_CURRENCIES = ["USD", "CNY"];

const STORAGE_KEY = "selectedCurrencies";
const RATES_CACHE_KEY = "currencyRatesCache";

const Tool: FC = () => {
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>([]);
  const [rates, setRates] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [open, setOpen] = useState(false);

  // Load selected currencies from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 2) {
          setSelectedCurrencies(parsed);
          return;
        }
      }
    } catch (error) {
      console.error("Failed to load saved currencies:", error);
    }
    // Default: USD and CNY (USD first)
    setSelectedCurrencies(["USD", "CNY"]);
  }, []);

  // Save selected currencies to localStorage
  useEffect(() => {
    if (selectedCurrencies.length >= 2) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedCurrencies));
      } catch (error) {
        console.error("Failed to save currencies:", error);
      }
    }
  }, [selectedCurrencies]);

  // Fetch exchange rates with date-based caching
  useEffect(() => {
    const fetchRates = async () => {
      try {
        // 1. Try to load from cache
        const cached = localStorage.getItem(RATES_CACHE_KEY);
        if (cached) {
          try {
            const { rates: cachedRates, date: cachedDate, fetchedAt } = JSON.parse(cached);
            
            const now = Date.now();
            const twelveHoursInMs = 12 * 60 * 60 * 1000;
            
            // Strategy: Use cache if it's recent enough (within 12 hours)
            // This handles all edge cases: weekends, holidays, timezone differences
            // Exchange rates update once per day, so 12-hour cache is reasonable
            if (fetchedAt && (now - fetchedAt < twelveHoursInMs)) {
              setRates(cachedRates);
              setLoading(false);
              return;
            } else {
              // Cache is older than 12 hours, show it first then update in background
              setRates(cachedRates);
              setLoading(false);
              // Continue to fetch new data below
            }
          } catch (e) {
            console.error("Failed to parse cached rates:", e);
          }
        }

        // 2. Fetch latest data from network
        setLoading(true);
        const response = await fetch("https://api.frankfurter.app/latest?base=USD", {
          cache: "no-cache",
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const allRates: Record<string, number> = { USD: 1, ...data.rates };
        const apiDate = data.date; // Date from API (YYYY-MM-DD format)
        
        // 3. Update state and cache (with timestamp)
        setRates(allRates);
        localStorage.setItem(
          RATES_CACHE_KEY,
          JSON.stringify({ 
            rates: allRates, 
            date: apiDate,
            fetchedAt: Date.now() // Timestamp when we fetched the data
          })
        );
      } catch (error) {
        // If cache exists, continue using it even if network fails
        const cached = localStorage.getItem(RATES_CACHE_KEY);
        if (cached) {
          try {
            const { rates: cachedRates } = JSON.parse(cached);
            setRates(cachedRates);
            toast.info("Using cached exchange rates (network request failed)");
          } catch (e) {
            console.error("Failed to use cached rates:", e);
            if (error instanceof Error) {
              toast.error(`Failed to fetch rates: ${error.message}`);
            } else {
              toast.error("Failed to fetch rates");
            }
          }
        } else {
          if (error instanceof Error) {
            toast.error(`Failed to fetch rates: ${error.message}`);
          } else {
            toast.error("Failed to fetch rates");
          }
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRates();
  }, []);

  // Initialize amounts after rates are loaded
  useEffect(() => {
    if (selectedCurrencies.length > 0 && Object.keys(rates).length > 0) {
      if (Object.keys(amounts).length === 0) {
        // Initial setup: 1 USD as base
        const initialAmounts: Record<string, string> = {};
        const baseAmountInUSD = 1; // 1 USD
        
        selectedCurrencies.forEach(code => {
          if (rates[code]) {
            const convertedAmount = baseAmountInUSD * rates[code];
            initialAmounts[code] = convertedAmount.toFixed(2);
          } else {
            initialAmounts[code] = "";
          }
        });
        setAmounts(initialAmounts);
      }
    }
  }, [selectedCurrencies, rates, amounts]);

  // Auto-update amounts when rates change
  useEffect(() => {
    if (Object.keys(rates).length > 0 && Object.keys(amounts).length > 0) {
      // Find first currency with value as base
      const baseCurrency = selectedCurrencies.find(code => amounts[code] && parseFloat(amounts[code]) > 0);
      
      if (baseCurrency && rates[baseCurrency]) {
        const baseValue = parseFloat(amounts[baseCurrency]);
        const amountInUSD = baseValue / rates[baseCurrency];
        
        // Recalculate all currencies
        const updatedAmounts: Record<string, string> = {};
        selectedCurrencies.forEach(code => {
          if (rates[code]) {
            const convertedAmount = amountInUSD * rates[code];
            updatedAmounts[code] = convertedAmount.toFixed(2);
          } else {
            updatedAmounts[code] = amounts[code] || "";
          }
        });
        
        // Only update if values changed
        const hasChanged = selectedCurrencies.some(
          code => updatedAmounts[code] !== amounts[code]
        );
        if (hasChanged) {
          setAmounts(updatedAmounts);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rates]);

  // Handle amount input change
  const handleAmountChange = (currencyCode: string, value: string) => {
    // Only allow numbers and decimal point
    if (value !== "" && !/^\d*\.?\d*$/.test(value)) {
      return;
    }

    if (!rates[currencyCode]) {
      setAmounts({ ...amounts, [currencyCode]: value });
      return;
    }

    // Clear all if empty
    if (value === "" || value === "0" || parseFloat(value) === 0) {
      const newAmounts: Record<string, string> = {};
      selectedCurrencies.forEach(code => {
        newAmounts[code] = "";
      });
      setAmounts(newAmounts);
      return;
    }

    const inputValue = parseFloat(value);
    
    // Calculate other currencies
    const newAmounts: Record<string, string> = { [currencyCode]: value };
    
    // Convert to USD first
    const amountInUSD = inputValue / rates[currencyCode];
    
    // Convert to other currencies
    selectedCurrencies.forEach(code => {
      if (code !== currencyCode && rates[code]) {
        const convertedAmount = amountInUSD * rates[code];
        newAmounts[code] = convertedAmount.toFixed(2);
      }
    });

    setAmounts(newAmounts);
  };

  // Add currency
  const addCurrency = (currencyCode: string) => {
    if (!selectedCurrencies.includes(currencyCode)) {
      setSelectedCurrencies([...selectedCurrencies, currencyCode]);
      
      // Calculate initial amount for new currency
      if (rates[currencyCode] && Object.keys(amounts).length > 0) {
        const firstCurrency = selectedCurrencies[0];
        if (firstCurrency && amounts[firstCurrency] && rates[firstCurrency]) {
          const firstAmount = parseFloat(amounts[firstCurrency]) || 0;
          const amountInUSD = firstAmount / rates[firstCurrency];
          const newAmount = amountInUSD * rates[currencyCode];
          setAmounts({ ...amounts, [currencyCode]: newAmount.toFixed(2) });
        }
      }
      
      toast.success(`Added ${currencyCode}`);
    }
  };

  // Remove currency
  const removeCurrency = (currencyCode: string) => {
    if (REQUIRED_CURRENCIES.includes(currencyCode)) {
      toast.error(`${currencyCode} is required and cannot be removed`);
      return;
    }
    if (selectedCurrencies.length <= 2) {
      toast.error("At least two currencies are required");
      return;
    }
    setSelectedCurrencies(selectedCurrencies.filter((c) => c !== currencyCode));
    
    // Remove corresponding amount
    const newAmounts = { ...amounts };
    delete newAmounts[currencyCode];
    setAmounts(newAmounts);
    
    toast.success(`Removed ${currencyCode}`);
  };

  // Get currency info
  const getCurrency = (code: string): Currency | undefined => {
    return AVAILABLE_CURRENCIES.find((c) => c.code === code);
  };

  return (
    <div className="flex flex-col gap-4 h-full">

      {/* Currency selector */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Label>Select Currencies</Label>
          {/* Add currency button - fixed at top right */}
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                <Plus className="size-4" />
                Add Currency
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="end" side="bottom" sideOffset={5}>
              <Command>
                <CommandInput placeholder="Search currencies..." />
                <CommandList>
                  <CommandEmpty>No currency found</CommandEmpty>
                  <CommandGroup>
                    {AVAILABLE_CURRENCIES.map((currency) => {
                      const isSelected = selectedCurrencies.includes(currency.code);
                      const isRequired = REQUIRED_CURRENCIES.includes(currency.code);
                      return (
                        <CommandItem
                          key={currency.code}
                          value={`${currency.code} ${currency.name}`}
                          disabled={isRequired}
                          onSelect={() => {
                            if (isRequired) return; // Required currencies cannot be toggled
                            if (isSelected && selectedCurrencies.length > 2) {
                              removeCurrency(currency.code);
                            } else if (!isSelected) {
                              addCurrency(currency.code);
                            }
                          }}
                        >
                          <Check
                            className={`mr-2 size-4 flex-shrink-0 ${
                              isSelected ? "opacity-100" : "opacity-0"
                            }`}
                          />
                          <span className="inline-block w-8 text-right flex-shrink-0">{currency.symbol}</span>
                          <span className="ml-2">{currency.code}</span>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        
        {/* Selected currency badges */}
        <div className="flex flex-wrap gap-2">
          {selectedCurrencies.map((code) => {
            const currency = getCurrency(code);
            const isRequired = REQUIRED_CURRENCIES.includes(code);
            return (
              <Badge
                key={code}
                variant={isRequired ? "default" : "secondary"}
                className={`relative gap-1 px-2.5 py-1 transition-all duration-200 ${
                  !isRequired 
                    ? "cursor-pointer hover:bg-destructive hover:text-destructive-foreground hover:border-destructive group" 
                    : ""
                }`}
                onClick={() => {
                  if (!isRequired) {
                    removeCurrency(code);
                  }
                }}
              >
                <span className={!isRequired ? "group-hover:opacity-0 transition-opacity duration-200" : ""}>
                  {currency?.symbol} {code}
                </span>
                {!isRequired && (
                  <X className="absolute inset-0 m-auto size-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                )}
              </Badge>
            );
          })}
        </div>
        
        <span className="text-xs text-muted-foreground">
          {REQUIRED_CURRENCIES.map((c) => getCurrency(c)?.code).join(", ")} are required. At least two currencies needed.
        </span>
      </div>

      {/* Currency list */}
      {loading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          Loading exchange rates...
        </div>
      ) : (
        <div className="flex flex-col gap-3 flex-1 overflow-auto">
          <div className="text-sm font-medium">Currency Amounts:</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 auto-rows-min">
            {selectedCurrencies.map((code) => {
              const currency = getCurrency(code);
              if (!currency) return null;
              
              return (
                <Card key={code} className="flex flex-col">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      <div className="leading-tight">
                        <div>{currency.symbol} {currency.code}</div>
                        <div className="text-xs font-normal mt-1">{currency.name}</div>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Input
                      type="text"
                      placeholder="Enter amount"
                      value={amounts[code] || ""}
                      onChange={(e) => handleAmountChange(code, e.target.value)}
                      className="text-xl font-semibold"
                    />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {!loading && Object.keys(rates).length > 0 && (
        <div className="text-xs text-muted-foreground">
          Exchange rate data from:{" "}
          <a
            href="https://www.frankfurter.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground transition-colors"
          >
            Frankfurter API
          </a>
          {" "}(Based on European Central Bank data)
        </div>
      )}
    </div>
  );
};

export default Tool;

