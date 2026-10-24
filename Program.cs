using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using FuzzyScorer.Demo;

var builder = WebAssemblyHostBuilder.CreateDefault(args);
builder.RootComponents.Add<App>("#app");
builder.RootComponents.Add<HeadOutlet>("head::after");

builder.Services.AddScoped<global::FuzzyScorer.IFuzzyScorer, global::FuzzyScorer.FuzzyScorer>();

await builder.Build().RunAsync();
