using System.Xml;
using CodeWalker.GameFiles;
using CodeWalkerCli.Utils;
using System.Text;

namespace CodeWalkerCli.Processing
{
    public class FileProcessor
    {
        private readonly string gtaPath;
        private GameFileCache? gameFileCache;

        public FileProcessor(string gtaPath)
        {
            this.gtaPath = gtaPath;
            InitializeCache();  
        }

        private void InitializeCache()
        {
            if (!Directory.Exists(gtaPath))
            {
                ConsoleUtils.WriteError("GTA V path not found");
                return;
            }
            ConsoleUtils.WriteInfo("Loading GTA V keys");
            GTA5Keys.LoadFromPath(gtaPath, false, null);
            
            ConsoleUtils.WriteInfo("Initializing cache");
            gameFileCache = new GameFileCache(
                    2147483648, // 2GB cache size
                    10,         // cache time
                    gtaPath,    // GTA V path
                    false,      //isgen9
                    "",         // DLC paths
                    true,       // enable mods
                    "Installers;_CommonRedist" // exclude folders
                );

                if (gameFileCache == null)
                {
                    throw new InvalidOperationException("Failed to create GameFileCache");
                }

                gameFileCache.EnableDlc = true;
                gameFileCache.EnableMods = true;
                gameFileCache.LoadPeds = true;
                gameFileCache.LoadVehicles = true;
                gameFileCache.LoadArchetypes = true;
                gameFileCache.BuildExtendedJenkIndex = true;

                gameFileCache.Init(
                    status => { },
                    error => ConsoleUtils.WriteError(error)
                );

                ConsoleUtils.WriteInfo("Cache initialized");
        }

        public void ImportXML(string inputPath, string outputPath, MetaFormat requestedFormat)
        {
            try
            {
                if (!File.Exists(inputPath))
                {
                    ConsoleUtils.WriteError($"Input file not found: ${inputPath}");
                    return;
                }

                string export_ext = Path.GetExtension(inputPath).ToLower().Replace(".", "");
                XmlDocument doc = new XmlDocument();
                doc.Load(inputPath);

                byte[] data = XmlMeta.GetData(doc, requestedFormat, string.Empty);
                File.WriteAllBytes(outputPath, data);
                ConsoleUtils.WriteSuccess("Conversion completed");
            }
            catch (Exception ex)
            {
                ConsoleUtils.WriteError(ex.Message);
                throw;
            }
        }

        public (string XmlContent, MetaFormat Format) ExportXml(string inputPath, string? outputPath, MetaFormat? requestedFormat)
        {
            try
            {
                Console.WriteLine($"Checking input file {inputPath}");
                MetaFormat metaFormat = MetaFormat.XML;
                string xmlContent = string.Empty;
                if (!File.Exists(inputPath))
                {
                    ConsoleUtils.WriteError($"Input file not found: {inputPath}");
                    return (xmlContent, metaFormat);
                }

                string file_ext = Path.GetExtension(inputPath).ToLower().Replace(".", "");
                if (requestedFormat != null)
                {
                    ConsoleUtils.WriteInfo($"Requested format: {requestedFormat}");
                    file_ext = requestedFormat?.ToString().ToLower() ?? file_ext;
                }

                ConsoleUtils.WriteInfo($"File ext found {file_ext}");
                switch (file_ext.ToLower())
                {
                    case "ymt":
                        ConsoleUtils.WriteInfo("Converting YMT to XML");
                        var ymt = new YmtFile();
                        var ymtData = File.ReadAllBytes(inputPath);
                        ymt.Load(ymtData);
                        xmlContent = MetaXml.GetXml(ymt, out _);
                        metaFormat = DetermineMetaFormat(ymt.Meta, ymt.Pso, ymt.Rbf);
                        break;

                    case "ymap":
                        ConsoleUtils.WriteInfo("Converting YMAP to XML");
                        var ymap = new YmapFile();
                        var ymapData = File.ReadAllBytes(inputPath);
                        ymap.Load(ymapData);
                        xmlContent = MetaXml.GetXml(ymap, out _);
                        metaFormat = DetermineMetaFormat(ymap.Meta, ymap.Pso, ymap.Rbf);
                        break;

                    case "ytyp":
                        ConsoleUtils.WriteInfo("Converting YTYP to XML");
                        var ytyp = new YtypFile();
                        var ytypData = File.ReadAllBytes(inputPath);
                        ytyp.Load(ytypData);
                        xmlContent = MetaXml.GetXml(ytyp, out _);
                        metaFormat = DetermineMetaFormat(ytyp.Meta, ytyp.Pso, ytyp.Rbf);
                        break;

                    case "pso":
                        ConsoleUtils.WriteInfo("Converting PSO to XML");
                        var pso = new PsoFile();
                        var psoData = File.ReadAllBytes(inputPath);
                        pso.Load(psoData);
                        xmlContent = PsoXml.GetXml(pso);
                        metaFormat = MetaFormat.PSO;
                        break;

                    case "yft":
                        ConsoleUtils.WriteInfo("Converting YFT to XML");
                        var yft = new YftFile();
                        var yftData = File.ReadAllBytes(inputPath);
                        yft.Load(yftData);
                        xmlContent = MetaXml.GetXml(yft, out _, "");
                        break;

                    default:
                        ConsoleUtils.WriteError($"Invalid file type {file_ext}. Supported types: pso, ymt, ymap, ytyp");
                        return (xmlContent, metaFormat);

                }

                if (outputPath != null && outputPath != string.Empty)
                {
                    ConsoleUtils.WriteInfo($"Writing output to {outputPath}:{outputPath.GetType()}");
                    File.WriteAllText(outputPath, xmlContent);
                }

                ConsoleUtils.WriteSuccess("Conversion completed");
                ConsoleUtils.WriteInfo($"Detected format: {metaFormat}");
                return (xmlContent, metaFormat);
            }
            catch (Exception ex)
            {
                ConsoleUtils.WriteError(ex.Message);
                return (string.Empty, MetaFormat.XML);
            }
        }

        public string ExportModel(string names, string? type)
        {
            if (gameFileCache == null)
                throw new InvalidOperationException("Game file cache not initialized");

            var modelNames = names.Split(',', StringSplitOptions.RemoveEmptyEntries);
            if (modelNames.Length == 0)
            {
                ConsoleUtils.WriteError("No valid model names provided");
                return string.Empty;
            }

            var results = new StringBuilder();
            int processedCount = 0;

            foreach (var name in modelNames)
            {
                if (string.IsNullOrWhiteSpace(name)) continue;

                var nameLower = name.Trim().ToLowerInvariant();
                var nameNoExt = Path.GetFileNameWithoutExtension(nameLower);
                uint hash = JenkHash.GenHash(nameLower);
                uint hashNoExt = JenkHash.GenHash(nameNoExt);

                GameFile? file = null;
                if (string.IsNullOrEmpty(type))
                {
                    file = gameFileCache.GetYdr(hash) ?? gameFileCache.GetYdr(hashNoExt);
                    if (file == null)
                    {
                        file = gameFileCache.GetYdd(hash) ?? gameFileCache.GetYdd(hashNoExt);
                    }
                    if (file == null)
                    {
                        file = gameFileCache.GetYtd(hash) ?? gameFileCache.GetYtd(hashNoExt);
                    }
                    if (file == null)
                    {
                        file = gameFileCache.GetYft(hash) ?? gameFileCache.GetYft(hashNoExt);
                    }
                }
                else
                {
                    file = type.ToLower() switch
                    {
                        "ydr" => gameFileCache.GetYdr(hash) ?? gameFileCache.GetYdr(hashNoExt),
                        "ydd" => gameFileCache.GetYdd(hash) ?? gameFileCache.GetYdd(hashNoExt),
                        "ytd" => gameFileCache.GetYtd(hash) ?? gameFileCache.GetYtd(hashNoExt),
                        "yft" => gameFileCache.GetYft(hash) ?? gameFileCache.GetYft(hashNoExt),
                        _ => throw new ArgumentException($"Unsupported file type: {type}")
                    };
                }

                if (file != null)
                {
                    string xmlContent = string.Empty;
                    bool loaded = false;

                    try
                    {
                        switch (file)
                        {
                            case YdrFile ydr:
                                loaded = gameFileCache.LoadFile(ydr);
                                if (loaded) xmlContent = YdrXml.GetXml(ydr, "");
                                break;
                            case YddFile ydd:
                                loaded = gameFileCache.LoadFile(ydd);
                                if (loaded) xmlContent = YddXml.GetXml(ydd, "");
                                break;
                            case YtdFile ytd:
                                loaded = gameFileCache.LoadFile(ytd);
                                if (loaded) xmlContent = YtdXml.GetXml(ytd, "");
                                break;
                            case YftFile yft:
                                loaded = gameFileCache.LoadFile(yft);
                                if (loaded) xmlContent = YftXml.GetXml(yft, "");
                                break;
                            default:
                                throw new InvalidOperationException($"Unsupported file type: {file.GetType().Name}");
                        }

                        if (!loaded || string.IsNullOrEmpty(xmlContent))
                        {
                            throw new InvalidOperationException($"Failed to load or convert file: {file.Name}");
                        }

                        // Add model info with validation
                        results.AppendLine($"---MODEL:{name}---");
                        results.AppendLine(xmlContent);
                        
                        processedCount++;
                        ConsoleUtils.WriteInfo($"Processed model {processedCount}/{modelNames.Length}: {name.Trim()}");
                    }
                    catch (Exception ex)
                    {
                        ConsoleUtils.WriteError($"Error processing file {name}: {ex.Message}");
                        continue;
                    }
                }
                else
                {
                    ConsoleUtils.WriteError($"Model not found: {name}");
                }
            }

            var finalResult = results.ToString().TrimEnd();
            if (string.IsNullOrEmpty(finalResult))
            {
                ConsoleUtils.WriteWarning("No models were successfully processed");
                return "No models found or processed";
            }

            ConsoleUtils.WriteSuccess($"Successfully processed {processedCount} model(s)");
            return finalResult;
        }

        private static MetaFormat DetermineMetaFormat(Meta? meta, PsoFile? pso, RbfFile? rbf)
        {
            if (meta != null) return MetaFormat.RSC;
            if (pso != null) return MetaFormat.PSO;
            if (rbf != null) return MetaFormat.RBF;
            return MetaFormat.XML;
        }
    }
}
