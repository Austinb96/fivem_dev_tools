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
        GTA5Keys.LoadFromPath(GTA_PATH, null);
        gameFileCache = new GameFileCache(
            2147483648,
            10,
            GTA_PATH,
            "",
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
                    var psoData = psoFile.Save();
                    File.WriteAllBytes(outputPath, psoData);
                    break;
                    
                case "ymt2xml":
                    InitCodeWalkerCache();
                    Console.WriteLine("[INFO] Converting YMT to XML");
                    var ymt = new YmtFile();
                    var ymtData = File.ReadAllBytes(inputPath);
                    ymt.Load(ymtData);
                    var ymtXmlContent = MetaXml.GetXml(ymt, out var ymtXml);
                    File.WriteAllText(outputPath, ymtXmlContent);
                    break;
                    
                case "ymap2xml":
                    InitCodeWalkerCache();
                    Console.WriteLine("[INFO] Converting YMAP to XML");
                    var ymap = new YmapFile();
                    var ymapData = File.ReadAllBytes(inputPath);
                    ymap.Load(ymapData);
                    var ymapXmlContent = MetaXml.GetXml(ymap, out var ymapXml);
                    File.WriteAllText(outputPath, ymapXmlContent);
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
