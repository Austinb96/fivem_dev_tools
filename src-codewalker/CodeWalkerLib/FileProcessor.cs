using System.Xml;
using CodeWalker.GameFiles;
using CodeWalkerCli.Utils;

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

            ConsoleUtils.WriteInfo("Initializing cache");
            GTA5Keys.LoadFromPath(gtaPath, null);
            gameFileCache = new GameFileCache(
                2147483648,
                10,
                gtaPath,
                "",
                true,
                "Installers;_CommonRedist"
            );

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
                    ConsoleUtils.WriteError("Input file not found");
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

        public MetaFormat ExportXml(string inputPath, string outputPath)
        {
            try
            {
                if (!File.Exists(inputPath))
                {
                    ConsoleUtils.WriteError("Input file not found");
                    return MetaFormat.XML;
                }

                MetaFormat metaFormat = MetaFormat.XML;
                string file_ext = Path.GetExtension(inputPath).ToLower().Replace(".", "");

                switch (file_ext)
                {
                    case "ymt":
                        ConsoleUtils.WriteInfo("Converting YMT to XML");
                        var ymt = new YmtFile();
                        var ymtData = File.ReadAllBytes(inputPath);
                        ymt.Load(ymtData);
                        var ymtXmlContent = MetaXml.GetXml(ymt, out _);
                        File.WriteAllText(outputPath, ymtXmlContent);
                        metaFormat = DetermineMetaFormat(ymt.Meta, ymt.Pso, ymt.Rbf);
                        break;

                    case "ymap":
                        ConsoleUtils.WriteInfo("Converting YMAP to XML");
                        var ymap = new YmapFile();
                        var ymapData = File.ReadAllBytes(inputPath);
                        ymap.Load(ymapData);
                        var ymapXmlContent = MetaXml.GetXml(ymap, out _);
                        File.WriteAllText(outputPath, ymapXmlContent);
                        metaFormat = DetermineMetaFormat(ymap.Meta, ymap.Pso, ymap.Rbf);
                        break;

                    case "ytyp":
                        ConsoleUtils.WriteInfo("Converting YTYP to XML");
                        var ytyp = new YtypFile();
                        var ytypData = File.ReadAllBytes(inputPath);
                        ytyp.Load(ytypData);
                        var ytypXmlContent = MetaXml.GetXml(ytyp, out _);
                        File.WriteAllText(outputPath, ytypXmlContent);
                        metaFormat = DetermineMetaFormat(ytyp.Meta, ytyp.Pso, ytyp.Rbf);
                        break;

                    default:
                        ConsoleUtils.WriteError($"Invalid file type {file_ext}. Supported types: pso, ymt, ymap, ytyp");
                        return metaFormat;
                }

                ConsoleUtils.WriteSuccess("Conversion completed");
                ConsoleUtils.WriteInfo($"Detected format: {metaFormat}");
                return metaFormat;
            }
            catch (Exception ex)
            {
                ConsoleUtils.WriteError(ex.Message);
                return MetaFormat.XML;
            }
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
