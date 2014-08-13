Bitbucket PR Badges
===================

Author: Juraj Novák, [Inloop](http://www.inloop.eu)

This Chrome extension (general browser userscript also available) enhances the Bitbucket pull request summary and detail website by adding status badges. This badges indicate the pull request's current state. The reviewer usually posts a comment **BTY** which means Back To You (there are errors you need to fix first), or **RTM** (Ready To Merge) which tells the developer that he can merge this pull request into master. The developer writes **RFRR** (Ready For Re-Review) in case he has fixed the problems and signals the reviewer to review it again.(this is usually after **BTY** from the reviewer).

These abbreviations are parsed by the script and transformed in colored badges. And the last status is also shown in the pull request summary in the repository, so that the reviewers/developers can quickly find pull requests that need their attention.

###Supported review abbreviations###

Abbreviation | Meaning
-----|-----------------
BTY  | Back to You
RFRR | Ready for Re-Review
RTM  |Ready to Merge

**[Install as Chrome plugin](http://link.sdsd)** from the official Chrome Store.  **[Or install script](https://bitbucket.org/yuraj/better-bitbucket/raw/master/better_bitbucket.user.js)** directly in your browser, in this case you have to use some userscript manager extension in your browser (see bottom of readme).

###See the current state of the pull request without the need to open it###
![](graphics/preview_1.png)


###The comments section now contains badges so you can quickly see the the progress###
![](graphics/preview_2.png)

Supported userscript manager extensions, in case you want to use the script directly and from as a Google Chrome extension:

**Google Chrome:**  
Tampermonkey 3.8+: https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo

**Mozilla Firefox:**  
Greasemonkey 2.1+: https://addons.mozilla.org/sk/firefox/addon/greasemonkey/

**Opera**  
Violentmonkey 2.1+ (or Tampermonkey): https://addons.opera.com/sk/extensions/details/violent-monkey/

**Safari**
not tested yet (https://github.com/os0x/NinjaKit)
