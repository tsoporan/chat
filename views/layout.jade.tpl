doctype html
html(lang="en")
  head
    meta(charset="utf-8")
    meta(name="viewport", content="width=device-width, initial-scale=1.0")
    title= title

    block assets
        link(rel="stylesheet", href="//fonts.googleapis.com/css?family=Lobster")

        //builtjs
        //builtcss

  body
    block content

    block scripts
