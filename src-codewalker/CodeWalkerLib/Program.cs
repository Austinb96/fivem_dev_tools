using System.Text.RegularExpressions;
using System.Xml;
using CodeWalker.GameFiles;

public class Program
{
    private const string GTA_PATH = "C:/Program Files/Rockstar Games/Grand Theft Auto V";
    private static GameFileCache? gameFileCache;

    public static void Main(string[] args)
    {
        if (args.Length == 0)
        {
            Console.WriteLine("[ERROR] No arguments provided");
            return;
        }

        switch (args[0])
        {
            case "convert":
                if (args.Length < 4)
                {
                    PrintUsage();
                    return;
                }
                ConvertFile(args[1], args[2], args[3]);
                break;
            default:
                PrintUsage();
                break;
        }
    }

    private static void PrintUsage()
    {
        Console.WriteLine("Usage:");
        Console.WriteLine("  convert <type> <input> <output>");
        Console.WriteLine("");
        Console.WriteLine("Types:");
        Console.WriteLine("  pso2xml - Convert PSO to XML");
        Console.WriteLine("  xml2pso - Convert XML to PSO");
        Console.WriteLine("");
        Console.WriteLine("Examples:");
        Console.WriteLine("  convert pso2xml input.ymt output.xml");
        Console.WriteLine("  convert xml2pso input.xml output.ymt");
    }

    private static void InitCodeWalkerCache()
    {
        if (!Directory.Exists(GTA_PATH))
        {
            Console.WriteLine("[ERROR] GTA V path not found");
            return;
        }

        Console.WriteLine("[INFO] Initializing cache");
        var dlcPaths = String.Join(";", new[]
    {
        // "mpBeach",
        // "mpBusiness",
        // "mpChristmas",
        // "mpValentines",
        // "mpBusiness2",
        // "mpHipster",
        // "mpIndependence",
        // "mpPilot",
        // "spUpgrade",
        // "mpLTS",
        // "mpheist",
        // "mppatchesng",
        // "patchday1ng",
        // "patchday2ng",
        // "mpchristmas2",
        // "patchday2bng",
        "patchday3ng"
        // "patchday4ng",
        // "mpluxe",
        // "patchday5ng",
        // "mpluxe2",
        // "patchday6ng",
        // "mpreplay",
        // "patchday7ng",
        // "mplowrider",
        // "mphalloween",
        // "patchday8ng",
        // "mpapartment",
        // "mpxmas_604490",
        // "mplowrider2",
        // "mpjanuary2016",
        // "mpvalentines2",
        // "patchday9ng",
        // "mpexecutive",
        // "patchday10ng",
        // "mpstunt",
        // "patchday11ng",
        // "mpimportexport",
        // "mpbiker",
        // "patchday12ng",
        // "patchday13ng",
        // "mpspecialraces",
        // "mpgunrunning",
        // "mpairraces",
        // "mpsmuggler",
        // "mpchristmas2017",
        // "mpassault",
        // "mpbattle",
        // "patchday14ng",
        // "patchday15ng",
        // "patchday16ng",
        // "patchday17ng",
        // "patchday18ng",
        // "patchday19ng",
        // "patchday20ng",
        // "mpchristmas2018",
        // "patchday21ng",
        // "mpvinewood",
        // "patchday22ng",
        // "mpheist3",
        // "mpsum",
        // "patchday23ng",
        // "mpheist4",
        // "patchday24ng",
        // "mptuner",
        // "patchday25ng",
        // "mpsecurity",
        // "patchday26ng",
        // "mpg9ec",
        // "patchdayg9ecng",
        // "mpsum2",
        // "patchday27ng",
        // "mpsum2_g9ec",
        // "patchday27g9ecng",
        // "mpchristmas3",
        // "mpchristmas3_g9ec",
        // "patchday28ng",
        // "patchday28g9ecng",
        // "mp2023_01",
        // "patch2023_01",
        // "patch2023_01_g9ec",
        // "mp2023_01_g9ec",
        // "mp2023_02",
        // "patch2023_02",
        // "mp2023_02_g9ec",
        // "mp2024_01",
        // "patch2024_01",
        // "patch2024_01_g9ec",
        // "mp2024_01_g9ec",
        // "mp2024_02",
        // "mp2024_02_g9ec",
        // "patch2024_02"
    });

        GTA5Keys.LoadFromPath(GTA_PATH, null);
        gameFileCache = new GameFileCache(
            2147483648,
            10,
            GTA_PATH,
            dlcPaths,
            true,
            "Installers;_CommonRedist"
        );

        gameFileCache.Init(
            status => { },
            error => Console.WriteLine($"[ERROR] {error}")
        );

        Console.WriteLine("[INFO] Cache initialized");
    }

    private static void ConvertFile(string type, string inputPath, string outputPath)
    {
        try
        {
            if (!File.Exists(inputPath))
            {
                Console.WriteLine("[ERROR] Input file not found");
                return;
            }


            switch (type.ToLower())
            {
                case "pso2xml":
                    InitCodeWalkerCache();
                    Console.WriteLine("[INFO] Converting PSO to XML");
                    var pso = new PsoFile();
                    var data = File.ReadAllBytes(inputPath);
                    pso.Load(data);
                    var xmlContent = PsoXml.GetXml(pso);
                    File.WriteAllText(outputPath, xmlContent);
                    break;

                case "xml2pso":
                    Console.WriteLine("[INFO] Converting XML to PSO");
                    XmlDocument xml = new XmlDocument();
                    xml.Load(inputPath);
                    var psoFile = XmlPso.GetPso(xml);
                    var ymtData = psoFile.Save();
                    File.WriteAllBytes(outputPath, ymtData);
                    break;

                default:
                    Console.WriteLine("[ERROR] Invalid conversion type");
                    PrintUsage();
                    return;
            }

            Console.WriteLine("[SUCCESS] Conversion completed");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ERROR] {ex.Message}");
        }
    }
}
