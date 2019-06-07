# How Much is a Billion Dollars?
Generating translations between numbers with NLP and Probabilistic Programming

## Overview
This repo has been developed together with the [Medium post](https://towardsdatascience.com/how-much-is-a-billion-dollars-7705053dd6d9) `How Much is a Billion Dollars?`:
it contains the Python and WebPPL code needed to re-create the project from scratch. The project is composed by two main parts:
a _knowledge base_, which is built automatically from [DBPedia](https://wiki.dbpedia.org/), and a _probabilistic model_, which is built 
leveraging the [compositional nature](https://towardsdatascience.com/fluid-concepts-and-creative-probabilities-785d3c81610a)
of language. 

Please see the blog post for more details on project motivations and final goals.

## Knowledge base generation

The `data` folder contains a copy of `dbpedia_2016-10.nt` for convenience. The two main DBPedia files used 
to generate the knowledge base are `mappingbased_literals_en.tql` and `mappingbased_objects_en.tql` 
(they are very big and 
can be found in [DBPedia download page](https://wiki.dbpedia.org/develop/datasets/downloads-2016-10)).

The code parsing DBPedia is contained in a Python notebook in the `notebooks` folder: the code 
is written in a pretty much standard Python 3.6 / Conda environment and it's just a bunch of pre-processing routines
to clean the huge text files.

Please note that the repo comes with some JSON files if you don't wish to re-run/alter the knowledge base generation 
code.

## Run the model locally in the browser 
Leveraging WebPPL Web Editor, we included a `web` folder with a plain one-page website: `index.html`. 

If you open the page in any browser you will have the chance to interact with a simplified probabilistic model and 
modify the code in real time.

## Run the model in the cloud ("web app" option)
The `serverless` folder includes self-contained code to run a WebPPL model from the cloud (AWS Lambda) and make it available
through a public URL. It's assumed you have `npm` and `Serverless` up and running:

* `cd` into the `serverless` folder; 
* install [dependencies](https://aws.amazon.com/it/premiumsupport/knowledge-center/lambda-deployment-package-nodejs/) with `npm install webppl`;
* finally, type `serverless deploy` to deploy the project.

To learn more about this quick deployment option, please refer to our [original template](https://github.com/jacopotagliabue/webppl_to_lambda_serverless) and [blog post](https://towardsdatascience.com/build-smart-er-applications-with-probabilistic-models-and-aws-lambda-functions-da982d69cab1?sk=fba1d20f1fe33c1499f7b2016187e793).

## References
The project was inspired by a delightful paper authored by [Chaganty and Liang](https://aclweb.org/anthology/P16-1055). Please see the blog post for more references. 

## License
All the code in this repo is provided "AS IS" and it is freely available under the [Apache License Version 2.0](https://www.apache.org/licenses/LICENSE-2.0).
