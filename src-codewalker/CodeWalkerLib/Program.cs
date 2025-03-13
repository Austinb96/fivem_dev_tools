using CommandLine;
using CodeWalkerCli.Commands;
using CodeWalkerCli.Utils;
using CodeWalkerCli.Interactive;
using CodeWalkerCli.Processing;

namespace CodeWalkerCli
{
    public class Program
    {
        private static readonly string DEFAULT_GTA_PATH = "C:/Program Files/Rockstar Games/Grand Theft Auto V";
        private static FileProcessor? processor;
        private static readonly Parser parser = new Parser(with =>
        {
            with.HelpWriter = Console.Out;
            with.CaseInsensitiveEnumValues = true;
            with.AutoHelp = true;
            with.EnableDashDash = true;
        });

        public static int Main(string[] args)
        {
            try
            {
                var gtaPath = Environment.GetEnvironmentVariable("GTA_PATH") ?? DEFAULT_GTA_PATH;
                
                if (!Directory.Exists(gtaPath))
                {
                    ConsoleUtils.WriteError($"GTA V path not found: {gtaPath}");
                    ConsoleUtils.WriteInfo($"Set GTA_PATH environment variable or use default path: {DEFAULT_GTA_PATH}");
                    return 1;
                }

                processor = new FileProcessor(gtaPath);
                
                var isPipedMode = Environment.GetEnvironmentVariable("CLIMODE") == "PIPED";

                if (isPipedMode || Console.IsInputRedirected)
                {
                    return RunPipedMode();
                }
                else if (args.Length > 0)
                {
                    return RunCommandLineMode(args);
                }
                return RunInteractiveMode();
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Error: {ex.Message}");
                return 1;
            }
        }

        private static int RunPipedMode()
        {
            Console.WriteLine("[CLI] Running in piped mode");
            Console.Out.Flush();

            string? line;
            while ((line = Console.ReadLine()) != null)
            {
                if (string.IsNullOrEmpty(line)) continue;

                try
                {
                    var args = line.Split(' ', StringSplitOptions.RemoveEmptyEntries);
                    ConsoleUtils.WriteCMD($"Processing command");
                    Console.Out.Flush();

                    if (args.Contains("-h") || args.Contains("--help"))
                    {
                        ConsoleUtils.WriteInfo("Displaying command help");
                        parser.ParseArguments<ExportOptions>(new[] { "--help" });
                        Console.Out.Flush();
                        ConsoleUtils.WriteCMD("Command completed");
                        continue;
                    }

                    var result = parser.ParseArguments<ImportOptions, ExportOptions>(args);
                    result
                        .WithParsed<ImportOptions>(opts => HandleImport(opts))
                        .WithParsed<ExportOptions>(opts => HandleExport(opts));

                    ConsoleUtils.WriteCMD("Command completed");
                    Console.Out.Flush();
                }
                catch (Exception ex)
                {
                    ConsoleUtils.WriteError($"{ex.Message}");
                    ConsoleUtils.WriteCMD("Command completed");
                    Console.Out.Flush();
                }
            }

            ConsoleUtils.WriteInfo("[CLI] Shutting down");
            return 0;
        }

        private static int RunInteractiveMode()
        {
            ConsoleUtils.WriteInfo("Interactive CLI mode. Type 'exit' to quit.");
            ConsoleUtils.WriteInfo("Use TAB for forward completion, Shift+TAB for backward completion");

            var inputHandler = new InputHandler();

            while (true)
            {
                var input = inputHandler.ReadLineWithCompletion();

                if (string.IsNullOrEmpty(input) || input.ToLower() == "exit")
                {
                    return 0;
                }

                var inputArgs = input.Split(' ', StringSplitOptions.RemoveEmptyEntries);
                HandleCommand(inputArgs);
            }
        }

        private static int RunCommandLineMode(string[] args)
        {
            Console.WriteLine("[INFO] Running in command line mode");
            Console.WriteLine($"[INFO] Processing command: {string.Join(" ", args)}");
            return Parser.Default.ParseArguments<ImportOptions, ExportOptions>(args)
                .MapResult(
                    (ImportOptions opts) => HandleImport(opts),
                    (ExportOptions opts) => HandleExport(opts),
                    errs => 1);
        }

        private static void HandleCommand(string[] args)
        {
            var types = new Type[] { typeof(ExportOptions), typeof(ImportOptions) };
            var result = parser.ParseArguments(args, types);

            result
                .WithParsed<ExportOptions>(opts => processor.ExportXml(opts.InputPath, opts.OutputPath, opts.MetaFormat))
                .WithParsed<ImportOptions>(opts => processor.ImportXML(opts.InputPath, opts.OutputPath, opts.MetaFormat))
                .WithNotParsed(errors =>
                {
                    foreach (var error in errors)
                    {
                        ConsoleUtils.WriteError($"Error: {error}");
                    }
                });
        }

        private static int HandleImport(ImportOptions opts)
        {
            if (string.IsNullOrEmpty(opts.InputPath) || string.IsNullOrEmpty(opts.OutputPath))
            {
                ConsoleUtils.WriteError("Input and output paths are required");
                return 1;
            }

            try
            {
                processor.ImportXML(opts.InputPath, opts.OutputPath, opts.MetaFormat);
                return 0;
            }
            catch (Exception ex)
            {
                ConsoleUtils.WriteError(ex.Message);
                return 1;
            }
        }

        private static int HandleExport(ExportOptions opts)
        {
            if (string.IsNullOrEmpty(opts.InputPath) || string.IsNullOrEmpty(opts.OutputPath))
            {
                ConsoleUtils.WriteError("Input and output paths are required");
                return 1;
            }

            try
            {
                ConsoleUtils.WriteInfo($"Input path: {opts.InputPath}");
                ConsoleUtils.WriteInfo($"Output path: {opts.OutputPath}");

                var format = processor.ExportXml(opts.InputPath, opts.OutputPath, opts.MetaFormat);
                ConsoleUtils.WriteInfo($"Final format: {format}");
                return 0;
            }
            catch (Exception ex)
            {
                ConsoleUtils.WriteError(ex.Message);
                return 1;
            }
        }
    }
}
