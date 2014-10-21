doctype html
html(lang="en", ng-app="chatApp")
  head
    meta(charset="utf-8")
    meta(http-equiv="X-UA-Compatible", content="IE-Edge")

    meta(name="viewport", content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no")
    title= title

    block assets
        link(rel="stylesheet", href="//fonts.googleapis.com/css?family=Lobster")

        //builtjs
        //builtcss

  body
    block content

    block scripts
