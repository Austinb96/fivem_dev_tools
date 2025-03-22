using CommandLine;
using CodeWalkerCli.Commands;
using CodeWalkerCli.Utils;
using CodeWalkerCli.Interactive;
using CodeWalkerCli.Processing;
using System.Text;

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
            Console.SetOut(new StreamWriter(Console.OpenStandardOutput()) { AutoFlush = false });
            Console.WriteLine("[CLI] Running in piped mode");
            Console.Out.Flush();

            string? line;
            while ((line = Console.ReadLine()) != null)
            {
                if (string.IsNullOrEmpty(line)) continue;

                try
                {
                    var args = SplitCommandLine(line);
                    ConsoleUtils.WriteCMD($"Processing command");

                    if (args.Contains("-h") || args.Contains("--help"))
                    {
                        ConsoleUtils.WriteInfo("Displaying command help");
                        parser.ParseArguments<ExportOptions>(new[] { "--help" });
                        ConsoleUtils.WriteCMD("Command completed");
                        continue;
                    }

                    var result = parser.ParseArguments<ImportOptions, ExportOptions, HelloOptions, ExportModelOptions>(args);
                    Console.WriteLine($"[CLI] Parsing arguments: {string.Join(" ", args)}");
                    result
                        .WithParsed<ImportOptions>(opts => HandleImport(opts))
                        .WithParsed<ExportOptions>(opts => HandleExport(opts))
                        .WithParsed<HelloOptions>(opts => HandleHello(opts))
                        .WithParsed<ExportModelOptions>(opts => HandleExportModel(opts));

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

                var args = SplitCommandLine(input);
                HandleCommand(args);
            }
        }

        private static int RunCommandLineMode(string[] args)
        {
            Console.WriteLine("[INFO] Running in command line mode");
            Console.WriteLine($"[INFO] Processing command: {string.Join(" ", args)}");
            return Parser.Default.ParseArguments<ImportOptions, ExportOptions, HelloOptions, ExportModelOptions>(args)
                .MapResult(
                    (ImportOptions opts) => HandleImport(opts),
                    (ExportOptions opts) => HandleExport(opts),
                    (HelloOptions opts) => HandleHello(opts),
                    (ExportModelOptions opts) => HandleExportModel(opts),
                    errs => 1);
        }

        private static void HandleCommand(string[] args)
        {
            var types = new Type[] { 
                typeof(ExportOptions), 
                typeof(ImportOptions), 
                typeof(HelloOptions),
                typeof(ExportModelOptions)
            };
            var result = parser.ParseArguments(args, types);
            
            result
                .WithParsed<ExportOptions>(opts => processor.ExportXml(opts.InputPath, opts.OutputPath, opts.MetaFormat))
                .WithParsed<ImportOptions>(opts => processor.ImportXML(opts.InputPath, opts.OutputPath, opts.MetaFormat))
                .WithParsed<ExportModelOptions>(opts => HandleExportModel(opts))
                .WithParsed<HelloOptions>(opts => HandleHello(opts))
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
            if (string.IsNullOrEmpty(opts.InputPath))
            {
                ConsoleUtils.WriteError("Input path is required");
                return 1;
            }

            try
            {
                ConsoleUtils.WriteInfo($"Input path: {opts.InputPath}");
                ConsoleUtils.WriteInfo($"Output path: {opts.OutputPath}");

                var (xmlContent, format) = processor.ExportXml(opts.InputPath, opts.OutputPath, opts.MetaFormat);
        
                Console.WriteLine("[OUTPUT_START]");
                Console.WriteLine(xmlContent);
                Console.WriteLine("[OUTPUT_END]");
                Console.Out.Flush();
                ConsoleUtils.WriteCMD("Command completed");
                return 0;
            }
            catch (Exception ex)
            {
                ConsoleUtils.WriteError(ex.Message);
                return 1;
            }
        }
        
        private static int HandleHello(HelloOptions opts)
        {
            Console.WriteLine($"Hello, {opts.Name}!");
            return 0;
        }
        
        private static int HandleExportModel(ExportModelOptions opts)
        {
            try
            {
                ConsoleUtils.WriteInfo($"Exporting {opts.Type} model: {opts.Name}");
                var data = processor.ExportModel(opts.Name, opts.Type);
                if(!string.IsNullOrEmpty(opts.OutputPath))
                {
                    File.WriteAllText(opts.OutputPath, data);
                }
                Console.WriteLine("[OUTPUT_START]");
                Console.WriteLine(data);
                Console.WriteLine("[OUTPUT_END]");
                Console.Out.Flush();
                return 0;
            }
            catch (Exception ex)
            {
                ConsoleUtils.WriteError(ex.Message);
                return 1;
            }
        }
        
        public static string[] SplitCommandLine(string commandLine)
        {
            var arguments = new List<string>();
            var currentArgument = new StringBuilder();
            var inQuotes = false;

            for (int i = 0; i < commandLine.Length; i++)
            {
                char c = commandLine[i];

                if (c == '"')
                {
                    inQuotes = !inQuotes;
                    continue;
                }

                if (!inQuotes && c == ' ')
                {
                    if (currentArgument.Length > 0)
                    {
                        arguments.Add(currentArgument.ToString());
                        currentArgument.Clear();
                    }
                    continue;
                }

                currentArgument.Append(c);
            }

            if (currentArgument.Length > 0)
            {
                arguments.Add(currentArgument.ToString());
            }

            return arguments.ToArray();
        }
    }
}



// exportmodel -n "ch2_03c_emissive_b,ch2_03c_hedge_fur_02,ch2_03c_rnchrocks001,ch2_03c_stable,ch2_03c_stable_d,ch2_03c_stable_a,ch2_03c_storage,ch2_03c_combo_win,ch2_03c_combo,ch2_03c_combo_d,ch2_03c_combo_a,ch2_03c_stable_a002,ch2_03c_stable_d002,ch2_03c_stable006,ch2_03c_combo_interior_win,ch2_03c_combo_interior,ch2_03c_combo_interior_ovr,ch2_03c_ranch_ground_ovr_03,ch2_03c_glue_03,ch2_03c_hedge_decal_02,ch2_03c_ranch_road_02,ch2_03c_cloth01,prop_weeddry_nxg01,prop_weeddry_nxg02,prop_weeds_nxg04,prop_weeds_nxg01,ch2_03c_lawn_fur_04,ch2_03c_ranch_grnd_fur_01,prop_cat_tail_01,prop_plant_cane_02a,prop_plant_cane_01a,prop_pot_plant_03a,prop_pot_plant_01c,prop_plant_int_01a,bkr_prop_biker_barstool_04,prop_bush_med_03,prop_creosote_b_01,prop_windmill2,prop_stickhbird,prop_birdbath1,prop_birdbathtap,prop_bench_06,prop_lawnmower_01,prop_bush_ivy_02_top,prop_bush_ivy_02_2m,prop_cooker_03,prop_cs_dildo_01,prop_utensil,v_ret_ml_beeram,v_ret_ml_beerbar,prop_plate_01,prop_plant_int_04a,prop_plant_int_04b,prop_pot_05,prop_cs_whiskey_bottle,ba_prop_battle_whiskey_opaque_s,ba_prop_battle_whiskey_bottle_s,prop_wall_light_13a,prop_barrel_02a,prop_wheelbarrow01a,prop_tool_shovel4,prop_bucket_02a,prop_grain_hopper,prop_hose_1,prop_box_wood01a,prop_box_wood07a,prop_oilcan_01a,prop_oilcan_02a,prop_sacktruck_02a,prop_shelves_02,prop_shelves_01,prop_rub_table_02,prop_paint_stepl01b,prop_tool_broom2,prop_tool_hardhat,prop_tool_shovel2,prop_tool_shovel5,prop_worklight_03b,prop_bin_07c,prop_drug_bottle,prop_toolchest_04,prop_toolchest_03,prop_compressor_01,prop_telegwall_03a,prop_byard_hoses01,prop_bench_11,prop_pot_plant_01a,prop_pot_plant_01b,prop_pot_plant_01d,prop_dumpster_02b,prop_wooden_barrel,prop_haybale_01,prop_air_woodsteps,prop_elecbox_22,prop_fire_exting_1a,prop_oldlight_01c,v_ind_cftub,prop_wheelbarrow02a,prop_tool_rake,prop_bin_03a,prop_oiltub_06,prop_tool_broom,prop_fncwood_09d,prop_fncwood_09b,prop_fncwood_09a,prop_storagetank_06,prop_fncwood_14e,prop_fncwood_14d,prop_fncwood_14c,prop_air_terlight_01c,prop_vend_soda_02,prop_vend_soda_01,prop_bush_med_05,prop_bar_coastchamp,prop_bar_coastdusc,v_ret_247_ketchup2,prop_wall_light_01a,prop_food_bs_soda_01,ch2_10_poolladd1,prop_streetlight_07b,ba_prop_battle_shot_glass_01,beerrow_world,prop_tequila,prop_amb_beer_bottle,prop_cocktail,prop_tequsunrise,prop_tequila_bottle,prop_vodka_bottle,lux_prop_ashtray_luxe_01,ex_prop_exec_ashtray_01,prop_cctv_cam_04b,prop_mp3_dock,ch_prop_ch_phone_ing_02a,prop_speaker_05,prop_tv_flat_michael"
