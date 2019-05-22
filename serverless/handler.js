const webppl = require('webppl');

// this lambda function simply returns the static html page for the one-page app
module.exports.app = (event, context, callback) => {
    // just print the event to cloudwatch for debug/inspection
    console.log(event);

    const html = `
    <html>
    <head>
        <title>How much is a billion dollars?</title>
        <meta charset="UTF-8"> 
        <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.3.1/jquery.min.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/2.4.0/Chart.min.js"></script>
        <link rel="icon" href="https://tooso.ai/assets/favicon.ico" />
        <style>
            body {
                margin: 0;
                font-family: 'Consolas', 'Deja Vu Sans Mono', 'Bitstream Vera Sans Mono', monospace;
                font-size: 14px;
                padding: 20px;
            }
            #inputContainer {
                margin-bottom: 20px;
            }
            input {
                font-family: 'Consolas', 'Deja Vu Sans Mono', 'Bitstream Vera Sans Mono', monospace;
                font-size: 12px;
            }
            #table-container {
                margin-top: 20px;
                margin-bottom: 20px;
            }
            /* FROM: https://jsfiddle.net/zinoui/dB93J/ */
            .my-table {
                border: solid 1px #DDEEEE;
                border-collapse: collapse;
                border-spacing: 0;
                font-family: 'Consolas', 'Deja Vu Sans Mono', 'Bitstream Vera Sans Mono', monospace;
                font-size: 12px;
            }
            .my-table thead th {
                background-color: #DDEFEF;
                border: solid 1px #DDEEEE;
                color: #336B6B;
                padding: 10px;
                text-align: left;
                text-shadow: 1px 1px 1px #fff;
            }
            .my-table tbody td {
                border: solid 1px #DDEEEE;
                color: #333;
                padding: 10px;
                text-shadow: 1px 1px 1px #fff;
            }
        </style>
    </head>
    <body>
      <h1>A.I. Perspective Generator: How Much is One Billion?</h1>
      <div>
        <div id="inputContainer">
        <input style="width:150px;" type="text" id="targetValue" value="1000000000" />&nbsp;
        <select id="targetUnit">
          <option value="$" selected>$</option>
          <option value="person">person</option>
        </select>
        </div>
        <input type="button" value="Generate perspective!" id="WebPPLBtn" />
      </div>
      <div id="table-container"></div>
    </body>
    <script>
        var TOP_N = 20;
        
        
        // on doc ready, display input fields/labels
        $( document ).ready(function() {
            console.log( "ready!" );
        });
        
        var displayResultsAsTable = function(data) {
            var probs = data.probs;
            var supports = data.support;
            var results = [];
            // build list of objects with all the data needed
            for(var k = 0; k < probs.length; k++) {
                var newResult = supports[k];
                newResult.p = probs[k];
                results.push(newResult);
            }
            // sort by probs
            results.sort((a, b) => (a.p < b.p) ? 1 : -1);
            
            data = []
            for(var i = 0; i < Math.min(TOP_N, results.length); i++) {
                data.push({'ex': results[i].ex, 'val': results[i].val});
            }
            
            var htmlCode = '<table class="my-table">';
            // header first
            var rowCode = '';
            var headerField = Object.keys(data[0]).sort();
            for(var y = 0; y < headerField.length; y++) {
                rowCode += '<th>' + headerField[y] + '</th>';   
            }
            htmlCode += '<thead><tr>' + rowCode + '</tr></thead><tbody>';
            // rows now
            for(var i = 0; i < data.length; i++) {
                var keys = Object.keys(data[i]).sort();
                var rowCode = '';
                for(var y = 0; y < keys.length; y++) {
                    rowCode += '<td>' + data[i][keys[y]] + '</td>';   
                }
                htmlCode += '<tr>' + rowCode + '</tr>';
            }
            htmlCode += "</tbody></table>";
            
            $('#table-container').html(htmlCode);
        };
    
        // bind ajax call to on click event
        $("#WebPPLBtn").click(function() {
            
            // loop over input fields to get values for params
            var params = {
                "targetValue": parseFloat($("#targetValue").val()),
                "targetUnit": $("#targetUnit").val()
            }
            console.log('Ajax params are: ' + JSON.stringify(params));
            
            // make ajax call to model API
            $.ajax({
              url: "/dev/model",
              type: "get", 
              data: params,
              dataType: 'json',
              // on success, draw data with chart.js
              success: function(data) {
                console.log("Data received: " + JSON.stringify(data));
                // get array of results
                var vals = data.val;
                displayResultsAsTable(vals);
              },
              // if something is wrong, just print an alert
              error: function(err) { alert("Error: " + JSON.stringify(err)); }
            });  
        });        
    </script>
    </html>`;

    const response = {
        statusCode: 200,
        headers: {'Content-Type': 'text/html'},
        body: html
    };

   callback(null, response);
};

// this is a wrapper to prepare a JSON response for lambda endpoint
const replyJson = (callback, statusCode, body) => {
    callback(null, {
        statusCode,
        body: JSON.stringify(body)
    });
};

// this lambda function returns the webppl model response
module.exports.model = (event, context, callback) => {
    // just print the event to cloudwatch for debug/inspection
    console.log(event);

    // set some default values
    var targetVal = 1000000000.0;
    var targetUnit = '$';

    // if no param at all or missing a mandatory one, throw error
    if (!event.queryStringParameters) {
        var errorMessage = "Parameters are missing!";

        // wrap error in a nicer JSON format
        replyJson(callback, 503, {error: errorMessage});
    }
    else {
        // overwrite params if there
        targetVal = event.queryStringParameters.targetVal ? event.queryStringParameters.targetVal : targetVal;
        targetUnit = event.queryStringParameters.targetUnit ? event.queryStringParameters.targetUnit : targetUnit;
        // dump to console for debug/inspection
        console.log([targetVal, targetUnit]);
    }

    // the easiest way to pass parameters to the model is to declare a code snippet on top and use the variables
    // in the model accordingly
    var modelParams = `
        var TARGET_EXP = {
               'q': ${targetVal},
               'd': 'target',
               'u': '${targetUnit}'
        }
     `;

    // model params here
    console.log("Model params are: " + JSON.stringify(modelParams));

    const code = `
        var kb = [{"q": 9833517.0, "d": "total area(the United States)", "u": "km2", "p": "http://dbpedia.org/ontology/areaTotal", "r": 0.007186802700166535}, {"q": 643801.0, "d": "total area(France)", "u": "km2", "p": "http://dbpedia.org/ontology/areaTotal", "r": 0.003950860550162792}, {"q": 242495.0, "d": "total area(United Kingdom)", "u": "km2", "p": "http://dbpedia.org/ontology/areaTotal", "r": 0.003695015230881345}, {"q": 7692024.0, "d": "total area(Australia)", "u": "km2", "p": "http://dbpedia.org/ontology/areaTotal", "r": 0.002422977593554051}, {"q": 3287263.0, "d": "total area(India)", "u": "km2", "p": "http://dbpedia.org/ontology/areaTotal", "r": 0.0020321067769586954}, {"q": 312679.0, "d": "total area(Poland)", "u": "km2", "p": "http://dbpedia.org/ontology/areaTotal", "r": 0.001964099363948922}, {"q": 357168.0, "d": "total area(Germany)", "u": "km2", "p": "http://dbpedia.org/ontology/areaTotal", "r": 0.0018617085787989104}, {"q": 9984670.0, "d": "total area(Canada)", "u": "km2", "p": "http://dbpedia.org/ontology/areaTotal", "r": 0.0018334121669364592}, {"q": 1648195.0, "d": "total area(Iran)", "u": "km2", "p": "http://dbpedia.org/ontology/areaTotal", "r": 0.001469264869374301}, {"q": 301338.0, "d": "total area(Italy)", "u": "km2", "p": "http://dbpedia.org/ontology/areaTotal", "r": 0.0011933027622936154}, {"q": 377972.28, "d": "total area(Japan)", "u": "km2", "p": "http://dbpedia.org/ontology/areaTotal", "r": 0.0008410791217839611}, {"q": 17075200.0, "d": "total area(Russia)", "u": "km2", "p": "http://dbpedia.org/ontology/areaTotal", "r": 0.0008397446879751727}, {"q": 8515767.0, "d": "total area(Brazil)", "u": "km2", "p": "http://dbpedia.org/ontology/areaTotal", "r": 0.0007253901539111475}, {"q": 423970.0, "d": "total area(State of California)", "u": "km2", "p": "http://dbpedia.org/ontology/areaTotal", "r": 0.0007041566815727556}, {"q": 505990.0, "d": "total area(Spain)", "u": "km2", "p": "http://dbpedia.org/ontology/areaTotal", "r": 0.0006861797913801511}, {"q": 5.7077625570776254e-05, "d": "runtime(EastEnders)", "u": "y", "p": "http://dbpedia.org/ontology/runtime", "r": 4.218111512113956e-05}, {"q": 4.1856925418569256e-05, "d": "runtime(Neighbours)", "u": "y", "p": "http://dbpedia.org/ontology/runtime", "r": 3.269917941739011e-05}, {"q": 5.7077625570776254e-05, "d": "runtime(Hollyoaks)", "u": "y", "p": "http://dbpedia.org/ontology/runtime", "r": 3.0562269783553905e-05}, {"q": 5.7077625570776254e-05, "d": "runtime(Coronation Street)", "u": "y", "p": "http://dbpedia.org/ontology/runtime", "r": 2.9927516794870996e-05}, {"q": 4.1856925418569256e-05, "d": "runtime(Emmerdale)", "u": "y", "p": "http://dbpedia.org/ontology/runtime", "r": 2.583950888480929e-05}, {"q": 4.756468797564688e-05, "d": "runtime(Doctor Who)", "u": "y", "p": "http://dbpedia.org/ontology/runtime", "r": 1.5130646168410683e-05}, {"q": 5.7077625570776254e-05, "d": "runtime(One Life to Live)", "u": "y", "p": "http://dbpedia.org/ontology/runtime", "r": 1.4350307659741895e-05}, {"q": 5.7077625570776254e-05, "d": "runtime(Shortland Street)", "u": "y", "p": "http://dbpedia.org/ontology/runtime", "r": 1.4024894494048665e-05}, {"q": 5.7077625570776254e-05, "d": "runtime(General Hospital)", "u": "y", "p": "http://dbpedia.org/ontology/runtime", "r": 1.3292193458323008e-05}, {"q": 5.7077625570776254e-05, "d": "runtime(As the World Turns)", "u": "y", "p": "http://dbpedia.org/ontology/runtime", "r": 1.030394555037108e-05}, {"q": 4.756468797564688e-05, "d": "runtime(Verbotene Liebe)", "u": "y", "p": "http://dbpedia.org/ontology/runtime", "r": 9.745175987302799e-06}, {"q": 5.7077625570776254e-05, "d": "runtime(All My Children)", "u": "y", "p": "http://dbpedia.org/ontology/runtime", "r": 9.29425103610177e-06}, {"q": 4.1856925418569256e-05, "d": "runtime(How I Met Your Mother)", "u": "y", "p": "http://dbpedia.org/ontology/runtime", "r": 7.134685204443407e-06}, {"q": 2.8538812785388127e-05, "d": "runtime(Guiding Light)", "u": "y", "p": "http://dbpedia.org/ontology/runtime", "r": 6.63385723490952e-06}, {"q": 5.7077625570776254e-05, "d": "runtime(Only Fools and Horses....)", "u": "y", "p": "http://dbpedia.org/ontology/runtime", "r": 6.597424553144828e-06}, {"q": 72.0, "d": "years of history(India)", "u": "y", "p": "http://dbpedia.org/ontology/foundingDate", "r": 0.0020321067769586954}, {"q": 26.0, "d": "years of history(Russia)", "u": "y", "p": "http://dbpedia.org/ontology/foundingDate", "r": 0.0008397446879751727}, {"q": 79.0, "d": "years of history(Norway)", "u": "y", "p": "http://dbpedia.org/ontology/foundingDate", "r": 0.0005991235732431925}, {"q": 99.0, "d": "years of history(Turkey)", "u": "y", "p": "http://dbpedia.org/ontology/foundingDate", "r": 0.00046642955512902383}, {"q": 71.0, "d": "years of history(Sri Lanka)", "u": "y", "p": "http://dbpedia.org/ontology/foundingDate", "r": 0.0002993492182557312}, {"q": 89.0, "d": "years of history(Pakistan)", "u": "y", "p": "http://dbpedia.org/ontology/foundingDate", "r": 0.0002881053075559932}, {"q": 97.0, "d": "years of history(Soviet Union (USSR))", "u": "y", "p": "http://dbpedia.org/ontology/foundingDate", "r": 0.00027407267614492395}, {"q": 45.0, "d": "years of history(Portugal)", "u": "y", "p": "http://dbpedia.org/ontology/foundingDate", "r": 0.00025255458224281467}, {"q": 78.0, "d": "years of history(Ukraine)", "u": "y", "p": "http://dbpedia.org/ontology/foundingDate", "r": 0.0002446152401284207}, {"q": 69.0, "d": "years of history(\u0ba4\u0bae\u0bbf\u0bb4\u0bcd \u0ba8\u0bbe\u0b9f\u0bc1)", "u": "y", "p": "http://dbpedia.org/ontology/foundingDate", "r": 0.00017328277428483126}, {"q": 63.0, "d": "years of history(\u0c95\u0cb0\u0ccd\u0ca8\u0cbe\u0c9f\u0c95)", "u": "y", "p": "http://dbpedia.org/ontology/foundingDate", "r": 0.00015680519668267125}, {"q": 63.0, "d": "years of history(\u0d15\u0d47\u0d30\u0d33\u0d02)", "u": "y", "p": "http://dbpedia.org/ontology/foundingDate", "r": 0.00015440185397795617}, {"q": 56.0, "d": "years of history(Kenya)", "u": "y", "p": "http://dbpedia.org/ontology/foundingDate", "r": 0.00015247543162735198}, {"q": 71.0, "d": "years of history(Israel)", "u": "y", "p": "http://dbpedia.org/ontology/foundingDate", "r": 0.00015117570281147078}, {"q": 59.0, "d": "years of history(Nigeria)", "u": "y", "p": "http://dbpedia.org/ontology/foundingDate", "r": 0.0001406075831812198}, {"q": 35.0, "d": "population density(the United States)", "u": "person/km2", "p": "http://dbpedia.org/ontology/populationDensity", "r": 0.007186802700166535}, {"q": 116.0, "d": "population density(France)", "u": "person/km2", "p": "http://dbpedia.org/ontology/populationDensity", "r": 0.003950860550162792}, {"q": 255.6, "d": "population density(United Kingdom)", "u": "person/km2", "p": "http://dbpedia.org/ontology/populationDensity", "r": 0.003695015230881345}, {"q": 2.8, "d": "population density(Australia)", "u": "person/km2", "p": "http://dbpedia.org/ontology/populationDensity", "r": 0.002422977593554051}, {"q": 123.0, "d": "population density(Poland)", "u": "person/km2", "p": "http://dbpedia.org/ontology/populationDensity", "r": 0.001964099363948922}, {"q": 227.0, "d": "population density(Germany)", "u": "person/km2", "p": "http://dbpedia.org/ontology/populationDensity", "r": 0.0018617085787989104}, {"q": 3.41, "d": "population density(Canada)", "u": "person/km2", "p": "http://dbpedia.org/ontology/populationDensity", "r": 0.0018334121669364592}, {"q": 48.0, "d": "population density(Iran)", "u": "person/km2", "p": "http://dbpedia.org/ontology/populationDensity", "r": 0.001469264869374301}, {"q": 201.3, "d": "population density(Italy)", "u": "person/km2", "p": "http://dbpedia.org/ontology/populationDensity", "r": 0.0011933027622936154}, {"q": 340.8, "d": "population density(Japan)", "u": "person/km2", "p": "http://dbpedia.org/ontology/populationDensity", "r": 0.0008410791217839611}, {"q": 8.4, "d": "population density(Russia)", "u": "person/km2", "p": "http://dbpedia.org/ontology/populationDensity", "r": 0.0008397446879751727}, {"q": 23.8, "d": "population density(Brazil)", "u": "person/km2", "p": "http://dbpedia.org/ontology/populationDensity", "r": 0.0007253901539111475}, {"q": 92.0, "d": "population density(Spain)", "u": "person/km2", "p": "http://dbpedia.org/ontology/populationDensity", "r": 0.0006861797913801511}, {"q": 15.5, "d": "population density(Norway)", "u": "person/km2", "p": "http://dbpedia.org/ontology/populationDensity", "r": 0.0005991235732431925}, {"q": 84.4, "d": "population density(Romania)", "u": "person/km2", "p": "http://dbpedia.org/ontology/populationDensity", "r": 0.0005621880859918989}, {"q": 5214900.0, "d": "people(Norway)", "u": "person", "p": "http://dbpedia.org/ontology/populationTotal", "r": 0.0005991235732431925}, {"q": 8673713.0, "d": "people(London)", "u": "person", "p": "http://dbpedia.org/ontology/populationTotal", "r": 0.0005162830036551527}, {"q": 9920881.0, "d": "people(Sweden)", "u": "person", "p": "http://dbpedia.org/ontology/populationTotal", "r": 0.000511435470171187}, {"q": 8550405.0, "d": "people(City of New York)", "u": "person", "p": "http://dbpedia.org/ontology/populationTotal", "r": 0.00041713975884602304}, {"q": 8341000.0, "d": "people(Switzerland)", "u": "person", "p": "http://dbpedia.org/ontology/populationTotal", "r": 0.0003422442844824316}, {"q": 8725931.0, "d": "people(Austria)", "u": "person", "p": "http://dbpedia.org/ontology/populationTotal", "r": 0.00030334905099508745}, {"q": 2063077.0, "d": "people(Slovenia)", "u": "person", "p": "http://dbpedia.org/ontology/populationTotal", "r": 0.00029759202331304573}, {"q": 9754830.0, "d": "people(Azerbaijan)", "u": "person", "p": "http://dbpedia.org/ontology/populationTotal", "r": 0.0002539953977712509}, {"q": 5707251.0, "d": "people(Denmark)", "u": "person", "p": "http://dbpedia.org/ontology/populationTotal", "r": 0.0002488070427336414}, {"q": 9855571.0, "d": "people(Hungary)", "u": "person", "p": "http://dbpedia.org/ontology/populationTotal", "r": 0.0002469245357462642}, {"q": 6378000.0, "d": "people(Ireland)", "u": "person", "p": "http://dbpedia.org/ontology/populationTotal", "r": 0.00022573180843518472}, {"q": 2229621.0, "d": "people(Paris)", "u": "person", "p": "http://dbpedia.org/ontology/populationTotal", "r": 0.00022428440233115442}, {"q": 7041599.0, "d": "people(Serbia)", "u": "person", "p": "http://dbpedia.org/ontology/populationTotal", "r": 0.00022122575382241998}, {"q": 1315944.0, "d": "people(Estonia)", "u": "person", "p": "http://dbpedia.org/ontology/populationTotal", "r": 0.00022105904308824173}, {"q": 5488543.0, "d": "people(Finland)", "u": "person", "p": "http://dbpedia.org/ontology/populationTotal", "r": 0.00021697764557460252}, {"q": 510000.0, "d": "net worth(Tyga)", "u": "$", "p": "http://dbpedia.org/ontology/networth", "r": 1.382325277208022e-06}, {"q": 73347.0, "d": "net worth(Alistair MacLean)", "u": "$", "p": "http://dbpedia.org/ontology/networth", "r": 8.574161052725408e-07}, {"q": 6000000.0, "d": "net worth(Alexandra Stan)", "u": "$", "p": "http://dbpedia.org/ontology/networth", "r": 8.20948845069831e-07}, {"q": 2500000.0, "d": "net worth(Juvenile)", "u": "$", "p": "http://dbpedia.org/ontology/networth", "r": 7.371298155184584e-07}, {"q": 8000000.0, "d": "net worth(B.G.)", "u": "$", "p": "http://dbpedia.org/ontology/networth", "r": 4.4066079707747954e-07}, {"q": 6000000.0, "d": "net worth(Ivana Mili\u010devi\u0107)", "u": "$", "p": "http://dbpedia.org/ontology/networth", "r": 3.802444802926787e-07}, {"q": 8700000.0, "d": "net worth(Barbara Windsor)", "u": "$", "p": "http://dbpedia.org/ontology/networth", "r": 3.522146039511548e-07}, {"q": 4300000.0, "d": "net worth(Sir Jimmy Savile)", "u": "$", "p": "http://dbpedia.org/ontology/networth", "r": 2.365716436845434e-07}, {"q": 100000.0, "d": "net worth(Joseph Henderson)", "u": "$", "p": "http://dbpedia.org/ontology/networth", "r": 2.1009935094522977e-07}, {"q": 8000000.0, "d": "net worth(Elvis Sekyanzi)", "u": "$", "p": "http://dbpedia.org/ontology/networth", "r": 2.1009935094522977e-07}, {"q": 1200000.0, "d": "net worth(Nicola Stapleton)", "u": "$", "p": "http://dbpedia.org/ontology/networth", "r": 1.791786320997418e-07}, {"q": 5250000.0, "d": "net worth(Timothy Eaton)", "u": "$", "p": "http://dbpedia.org/ontology/networth", "r": 1.680835506316549e-07}, {"q": 2000000.0, "d": "net worth(William D. Orthwein)", "u": "$", "p": "http://dbpedia.org/ontology/networth", "r": 1.6248144392317827e-07}, {"q": 1000000.0, "d": "net worth(Jamshedji Tata)", "u": "$", "p": "http://dbpedia.org/ontology/networth", "r": 1.5995741782375475e-07}, {"q": 7500000.0, "d": "net worth(Shawn Fanning)", "u": "$", "p": "http://dbpedia.org/ontology/networth", "r": 1.5767963817305545e-07}, {"q": 100000.0, "d": "salary(Warren Buffett)", "u": "$/y", "p": "http://dbpedia.org/ontology/salary", "r": 4.5488025511754084e-07}, {"q": 242408.0, "d": "salary(Derek Mooney)", "u": "$/y", "p": "http://dbpedia.org/ontology/salary", "r": 3.137510434370661e-07}, {"q": 330014.0, "d": "salary(Richard Roberts)", "u": "$/y", "p": "http://dbpedia.org/ontology/salary", "r": 2.701219228217653e-07}, {"q": 366867.0, "d": "salary(Ryan Tubridy)", "u": "$/y", "p": "http://dbpedia.org/ontology/salary", "r": 2.565651763678929e-07}, {"q": 302000.0, "d": "salary(Miriam O'Callaghan)", "u": "$/y", "p": "http://dbpedia.org/ontology/salary", "r": 2.5376412301365453e-07}, {"q": 90000.0, "d": "salary(Paul Shoup)", "u": "$/y", "p": "http://dbpedia.org/ontology/salary", "r": 2.461128940711511e-07}, {"q": 340.0, "d": "salary(Brian Cookson)", "u": "$/y", "p": "http://dbpedia.org/ontology/salary", "r": 2.1009935094522977e-07}, {"q": 485085.0, "d": "salary(Steve Penny)", "u": "$/y", "p": "http://dbpedia.org/ontology/salary", "r": 2.1009935094522977e-07}, {"q": 229056.0, "d": "salary(Marty Whelan)", "u": "$/y", "p": "http://dbpedia.org/ontology/salary", "r": 2.0278751037117907e-07}, {"q": 130000.0, "d": "salary(Scott Mills)", "u": "$/y", "p": "http://dbpedia.org/ontology/salary", "r": 1.850228466611658e-07}, {"q": 80000.0, "d": "salary(Jeff Bezos)", "u": "$/y", "p": "http://dbpedia.org/ontology/salary", "r": 1.6781578076213054e-07}, {"q": 100000.0, "d": "salary(Charlie Munger)", "u": "$/y", "p": "http://dbpedia.org/ontology/salary", "r": 1.4303964995213495e-07}, {"q": 157332.0, "d": "salary(Bruce Chapman)", "u": "$/y", "p": "http://dbpedia.org/ontology/salary", "r": 1.3807226469338718e-07}, {"q": 171212.0, "d": "salary(Thomas S. Ricketts)", "u": "$/y", "p": "http://dbpedia.org/ontology/salary", "r": 1.339564311932819e-07}, {"q": 150000.0, "d": "salary(Ian Blatchford)", "u": "$/y", "p": "http://dbpedia.org/ontology/salary", "r": 1.2606775031808007e-07}, {"q": 48850.0, "d": "tuition(Phillips Academy Andover)", "u": "$/y", "p": "http://dbpedia.org/ontology/tuition", "r": 1.909389246686207e-06}, {"q": 46905.0, "d": "tuition(Phillips Exeter Academy)", "u": "$/y", "p": "http://dbpedia.org/ontology/tuition", "r": 1.3248086396303387e-06}, {"q": 4350.0, "d": "tuition(Peterhouse Boys' School)", "u": "$/y", "p": "http://dbpedia.org/ontology/tuition", "r": 5.953351304437214e-07}, {"q": 14100.0, "d": "tuition(Christian Brothers College High School)", "u": "$/y", "p": "http://dbpedia.org/ontology/tuition", "r": 5.814389956213962e-07}, {"q": 20225.0, "d": "tuition(Saint Ignatius College Preparatory)", "u": "$/y", "p": "http://dbpedia.org/ontology/tuition", "r": 5.763253843030836e-07}, {"q": 17250.0, "d": "tuition((Collegium Sancti Benedicti))", "u": "$/y", "p": "http://dbpedia.org/ontology/tuition", "r": 5.161210162235296e-07}, {"q": 20500.0, "d": "tuition(Loyola Blakefield)", "u": "$/y", "p": "http://dbpedia.org/ontology/tuition", "r": 4.43513330991308e-07}, {"q": 18000.0, "d": "tuition(Marin Catholic High School)", "u": "$/y", "p": "http://dbpedia.org/ontology/tuition", "r": 4.405860269511262e-07}, {"q": 14050.0, "d": "tuition(Notre Dame High School)", "u": "$/y", "p": "http://dbpedia.org/ontology/tuition", "r": 4.2921551723113837e-07}, {"q": 13125.0, "d": "tuition(Servite High School)", "u": "$/y", "p": "http://dbpedia.org/ontology/tuition", "r": 4.1286651193905335e-07}, {"q": 10600.0, "d": "tuition(Mount Carmel High School)", "u": "$/y", "p": "http://dbpedia.org/ontology/tuition", "r": 4.004478558090737e-07}, {"q": 44000.0, "d": "tuition(The Dunn School)", "u": "$/y", "p": "http://dbpedia.org/ontology/tuition", "r": 3.945687218457823e-07}, {"q": 8250.0, "d": "tuition(Jesuit High School)", "u": "$/y", "p": "http://dbpedia.org/ontology/tuition", "r": 3.902602084945648e-07}, {"q": 20050.0, "d": "tuition(Ursuline Academy)", "u": "$/y", "p": "http://dbpedia.org/ontology/tuition", "r": 3.8913810819981e-07}, {"q": 8000.0, "d": "tuition(Chaminade High School)", "u": "$/y", "p": "http://dbpedia.org/ontology/tuition", "r": 3.863110710482226e-07}, {"q": 1474899.0, "d": "career money(Chris Guccione)", "u": "$", "p": "http://dbpedia.org/ontology/careerPrizeMoney", "r": 6.700437445819962e-07}, {"q": 2118021.0, "d": "career money(Dustin Brown)", "u": "$", "p": "http://dbpedia.org/ontology/careerPrizeMoney", "r": 3.315164391983359e-07}, {"q": 433522.0, "d": "career money(Vincent Van Patten)", "u": "$", "p": "http://dbpedia.org/ontology/careerPrizeMoney", "r": 3.2805080025805205e-07}, {"q": 1199194.0, "d": "career money(Florin Mergea)", "u": "$", "p": "http://dbpedia.org/ontology/careerPrizeMoney", "r": 2.941309515723795e-07}, {"q": 2630621.0, "d": "career money(Jamie Murray)", "u": "$", "p": "http://dbpedia.org/ontology/careerPrizeMoney", "r": 2.644626517591205e-07}, {"q": 2817982.0, "d": "career money(Dudi Sela)", "u": "$", "p": "http://dbpedia.org/ontology/careerPrizeMoney", "r": 2.3370822921666708e-07}, {"q": 193090.0, "d": "career money(Divij Sharan)", "u": "$", "p": "http://dbpedia.org/ontology/careerPrizeMoney", "r": 1.5767963817305545e-07}, {"q": 1154336.0, "d": "career money(James Ward)", "u": "$", "p": "http://dbpedia.org/ontology/careerPrizeMoney", "r": 1.3144119960988418e-07}, {"q": 5378067.0, "d": "career money(Anders J\u00e4rryd)", "u": "$", "p": "http://dbpedia.org/ontology/careerPrizeMoney", "r": 1.2846865319314148e-07}, {"q": 363823.0, "d": "career money(M\u00e1rton Fucsovics)", "u": "$", "p": "http://dbpedia.org/ontology/careerPrizeMoney", "r": 1.2366684744301866e-07}, {"q": 514485.0, "d": "career money(Brydan Klein)", "u": "$", "p": "http://dbpedia.org/ontology/careerPrizeMoney", "r": 1.232095326096736e-07}, {"q": 1349247.0, "d": "career money(Darren Cahill)", "u": "$", "p": "http://dbpedia.org/ontology/careerPrizeMoney", "r": 1.0205872156746585e-07}, {"q": 1584061.0, "d": "career money(V\u00edctor Estrella)", "u": "$", "p": "http://dbpedia.org/ontology/careerPrizeMoney", "r": 1.0205872156746585e-07}, {"q": 381323.0, "d": "career money(Amir Weintraub)", "u": "$", "p": "http://dbpedia.org/ontology/careerPrizeMoney", "r": 1.0205872156746585e-07}, {"q": 2287611.0, "d": "career money(Scott Davis)", "u": "$", "p": "http://dbpedia.org/ontology/careerPrizeMoney", "r": 9.48560129422816e-08}];
var kbDistribution = Categorical({"ps": [2.70805020110221, 2.6390573296152584, 2.5649493574615367, 2.4849066497880004, 2.3978952727983707, 2.302585092994046, 2.1972245773362196, 2.0794415416798357, 1.9459101490553132, 1.791759469228055, 1.6094379124341003, 1.3862943611198906, 1.0986122886681098, 0.6931471805599453, 0.0, 2.70805020110221, 2.6390573296152584, 2.5649493574615367, 2.4849066497880004, 2.3978952727983707, 2.302585092994046, 2.1972245773362196, 2.0794415416798357, 1.9459101490553132, 1.791759469228055, 1.6094379124341003, 1.3862943611198906, 1.0986122886681098, 0.6931471805599453, 0.0, 2.70805020110221, 2.6390573296152584, 2.5649493574615367, 2.4849066497880004, 2.3978952727983707, 2.302585092994046, 2.1972245773362196, 2.0794415416798357, 1.9459101490553132, 1.791759469228055, 1.6094379124341003, 1.3862943611198906, 1.0986122886681098, 0.6931471805599453, 0.0, 2.70805020110221, 2.6390573296152584, 2.5649493574615367, 2.4849066497880004, 2.3978952727983707, 2.302585092994046, 2.1972245773362196, 2.0794415416798357, 1.9459101490553132, 1.791759469228055, 1.6094379124341003, 1.3862943611198906, 1.0986122886681098, 0.6931471805599453, 0.0, 2.70805020110221, 2.6390573296152584, 2.5649493574615367, 2.4849066497880004, 2.3978952727983707, 2.302585092994046, 2.1972245773362196, 2.0794415416798357, 1.9459101490553132, 1.791759469228055, 1.6094379124341003, 1.3862943611198906, 1.0986122886681098, 0.6931471805599453, 0.0, 2.70805020110221, 2.6390573296152584, 2.5649493574615367, 2.4849066497880004, 2.3978952727983707, 2.302585092994046, 2.1972245773362196, 2.0794415416798357, 1.9459101490553132, 1.791759469228055, 1.6094379124341003, 1.3862943611198906, 1.0986122886681098, 0.6931471805599453, 0.0, 2.70805020110221, 2.6390573296152584, 2.5649493574615367, 2.4849066497880004, 2.3978952727983707, 2.302585092994046, 2.1972245773362196, 2.0794415416798357, 1.9459101490553132, 1.791759469228055, 1.6094379124341003, 1.3862943611198906, 1.0986122886681098, 0.6931471805599453, 0.0, 2.70805020110221, 2.6390573296152584, 2.5649493574615367, 2.4849066497880004, 2.3978952727983707, 2.302585092994046, 2.1972245773362196, 2.0794415416798357, 1.9459101490553132, 1.791759469228055, 1.6094379124341003, 1.3862943611198906, 1.0986122886681098, 0.6931471805599453, 0.0, 2.70805020110221, 2.6390573296152584, 2.5649493574615367, 2.4849066497880004, 2.3978952727983707, 2.302585092994046, 2.1972245773362196, 2.0794415416798357, 1.9459101490553132, 1.791759469228055, 1.6094379124341003, 1.3862943611198906, 1.0986122886681098, 0.6931471805599453, 0.0], "vs": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134]});
        
        var MAX_EXP_LENGTH = 4;
        
        var maxExec = 20000;
        
        var discretizeRange = function(start, end, step) {
            return mapN(function(x) { return start + (x * step); }, Math.floor((end - start) / step))
        }
        
        var bigBetas = discretizeRange(50, 100, 10);
        var smallBetas = [0.5, 1.0];
        
        var getFactDescription = function(fact) {
            return fact.d + '(' + fact.q + ' ' + fact.u + ')';
        }
        
        var prettify = function(prettyEx, factList) {
          var currentExp = (prettyEx == null) ? getFactDescription(factList[0]) :  prettyEx + ' X ' + getFactDescription(factList[0]);
        
          return (factList.length == 1) ? currentExp : prettify(currentExp, factList.slice(1));
        }
        
        var multiplyUnits = function(u1, u2) {
            // support units like s and fractions like $/s
            var b1 = u1.split('/')
            var b2 = u2.split('/')
            var u = (u1 == u2) ?  null:  // if it's $ X $, return null
                    (b1[0] == b2[1]) ? b2[0] :  // if it's s X $/s, return $
                    (b2[0] == b1[1]) ? b1[0] :
                     null;
        
            return u;
        }
        
        var multiplyFacts = function(f1, f2) {
            var newUnit = multiplyUnits(f1.u, f2.u)
        
            return (newUnit == null) ? null : {
                        'q': f1.q * f2.q,
                        'u': newUnit
                    }
        }
        
        var runExpression = function(f, factList) {
        
            var currentExp = (f == null) ? factList[0] : multiplyFacts(f, factList[0]);
        
            return (factList.length == 1 || currentExp == null) ? currentExp : runExpression(currentExp, factList.slice(1));
        }
        
        var randomExpression = function(factList) {
        
          var fact = kb[sample(kbDistribution)];
          var newFacts = factList.concat([fact]);
        
          return (newFacts.length == 1) ? randomExpression(newFacts):
                 (newFacts.length == MAX_EXP_LENGTH) ? newFacts:
                 (flip())? randomExpression(newFacts):
                 newFacts;
        }

        var m = Infer({
          method: 'enumerate',
          maxExecutions: maxExec,
          model: function() {
            var e = randomExpression([]);
            var res = runExpression(null, e);
            condition(res != null && res.u == TARGET_EXP.u)
            var b = flip(0.75) ? uniformDraw(smallBetas) : uniformDraw(bigBetas);
            var candidateValue = res.q * b;
            var err = candidateValue - TARGET_EXP.q;
            var prettyEx = b.toString() + ' X ' + prettify(null, e);
            observe(Gaussian({mu: 0.0, sigma: (TARGET_EXP.q / 100.0)}), err);
        
            return {
                    ex: prettyEx,
                    val: candidateValue
             };
          }
        });

        m
    `;

    // running webppl code as the concatenation of model params + model code
    webppl.run(modelParams + code, (s, val) => {
        replyJson(callback, 200, { s, val });
    });

};