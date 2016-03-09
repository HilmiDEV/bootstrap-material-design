import {Preset, Clean, Copy, MinifyCss, Sass, RollupEs, RollupUmd, RollupIife, ScssLint, EsLint, TaskSeries, Uglify} from 'gulp-pipeline/src/index'

// debug the project source - remove for repo
//import {Clean, CleanDigest, Images, MinifyCss, Sass, RollupIife, ScssLint, EsLint, Rev, TaskSeries} from 'gulp-pipeline'
//import Preset from '../../../gulp-pipeline/src/preset'
import extend from 'extend'

import stringify from 'stringify-object'
import gulp from 'gulp'
import findup from 'findup-sync'
const node_modules = findup('node_modules')
import pkg from './package.json'
import moment from 'moment'


let preset = Preset.baseline({
  javascripts: {
    source: {options: {cwd: 'js/src'}},
    watch: {options: {cwd: 'js/src'}},
    test: {options: {cwd: 'js/tests'}}
  },
  stylesheets: {
    source: {options: {cwd: 'scss'}},
    watch: {options: {cwd: 'scss'}}
  },
  images: {
    source: {options: {cwd: 'images'}},
    watch: {options: {cwd: 'images'}}
  }
})


// When converting non-modular dependencies into usable ones using rollup-plugin-commonjs, if they don't have properly read exports add them here.
let namedExports = {}
//namedExports[`${node_modules}/corejs-typeahead/dist/bloodhound.js`] = ['Bloodhound']
//namedExports[`${node_modules}/anchor-js/anchor.js`] = ['AnchorJS']

let rollupConfig = {
  //debug: true,
  options: {
    external: [
      'anchor-js',
      'clipboard'
    ],
    globals: {
      'anchor-js': 'anchors',
      clipboard: 'Clipboard'
    },
    banner: `/*!
  * Bootstrap Material Design v${pkg.version} (${pkg.homepage})
  * Copyright 2014-${moment().format("YYYY")} ${pkg.author}
  * Licensed under MIT (https://github.com/FezVrasta/bootstrap-material-design/blob/master/LICENSE)
  */`
  },
  commonjs: {
    options: {
      namedExports: namedExports,
    }
  }
}

let rollups = [
  new RollupEs(gulp, preset, extend(true, {}, rollupConfig, {options: {dest: 'bootstrap-material-design.es.js'}})),
  new RollupUmd(gulp, preset, extend(true, {}, rollupConfig, {
    options: {
      dest: 'bootstrap-material-design.umd.js',
      moduleName: 'bootstrapMaterialDesign'
    }
  })),
  new RollupIife(gulp, preset, extend(true, {}, rollupConfig, {
    options: {
      dest: 'bootstrap-material-design.iife.js',
      moduleName: 'bootstrapMaterialDesign'
    }
  })),
]

let eslint = new EsLint(gulp, preset)
let scsslint = new ScssLint(gulp, preset)
let sass = new Sass(gulp, preset)
let lint = [scsslint, eslint]

// instantiate ordered array of recipes (for each instantiation the tasks will be created e.g. sass and sass:watch)
let recipes = [
  new Clean(gulp, preset),
  lint,
  [
    sass,
    rollups
  ],
  new MinifyCss(gulp, preset)
]

// Simple helper to create the default and watch tasks as a sequence of the recipes already defined
new TaskSeries(gulp, 'default', recipes)
new TaskSeries(gulp, 'lint', lint)
new TaskSeries(gulp, 'js', [eslint, rollups])
new TaskSeries(gulp, 'css', [scsslint, sass])


/**
 * DOCS
 */

const referenceDocNotice =
  `$1\n
[//]: # DO NOT EDIT IT WILL BE OVERWRITTEN - copy of bootstrap documentation generated by grunt docs-copy-bootstrap-docs\n
{% callout info %}\n**Bootstrap Reference Documentation**
This is a part of the reference documentation from <a href="http://getbootstrap.com">Bootstrap</a>.
It is included here to demonstrate rendering with Material Design for Bootstrap default styling.
See the <a href="/material-design/buttons">Material Design</a> section for more elements and customization options.
{% endcallout %}
\n\n$2`


let docsPreset = Preset.baseline({
  javascripts: {
    source: {options: {cwd: 'docs/assets/js/src'}},
    watch: {options: {cwd: 'docs/assets/js/src'}},
    test: {options: {cwd: 'docs/assets/js/tests'}},
    dest: 'docs/dist'
  },
  stylesheets: {
    source: {options: {cwd: 'docs/assets/scss'}},
    watch: {options: {cwd: 'docs/assets/scss'}},
    dest: 'docs/dist'
  }
})

const docsConfig = {task: {prefix: 'docs:'}}

let docs = [
  [
    new ScssLint(gulp, docsPreset, docsConfig, {
      source: {glob: ['**/*.scss', '!docs.scss']},
      watch: {glob: ['**/*.scss', '!docs.scss']}
    }),
    new EsLint(gulp, docsPreset, docsConfig)
  ],
  [
    new RollupIife(gulp, docsPreset, docsConfig, rollupConfig, {
      options: {
        dest: 'docs.iife.js',
        moduleName: 'docs'
      }
    }),
    new Uglify(gulp, docsPreset, docsConfig, {
      task: {name: 'vendor:uglify'},
      source: {options: {cwd: 'docs/assets/js/vendor'}},
      options: {dest: 'docs-vendor.min.js'}
    }),
    new Sass(gulp, docsPreset, docsConfig)
  ]
]


const docsProcess = (content, srcpath) => { // https://regex101.com/r/cZ7aO8/2
  return content
    .replace(/(---[\s\S]+?---)([\s\S]+)/mg, referenceDocNotice) // insert docs reference
    .replace(/Fancy display heading/, 'Fancy heading')          // remove sample text 'display' as this is a particular MD style and is confusing
}

let bsDocs = [
  new Copy(gulp, docsPreset, docsConfig, {
    task: {name: 'copy:bs-docs-content'},
    source: {
      options: {cwd: '../bootstrap/docs/content'},
      glob: ['**/*']
    },
    dest: 'docs/content/',
    process: docsProcess
  }),

  new Copy(gulp, docsPreset, docsConfig, {
    task: {name: 'copy:bs-docs-components'},
    source: {
      options: {cwd: '../bootstrap/docs/components'},
      glob: ['**/*']
    },
    dest: 'docs/components/',
    process: docsProcess
  }),

  new Copy(gulp, docsPreset, docsConfig, {
    task: {name: 'copy:bs-docs-scss'},
    source: {
      options: {cwd: '../bootstrap/docs/assets/scss'},
      glob: ['**/*', '!docs.scss'] // keep variable customizations
    },
    dest: 'docs/assets/scss/',
    process: (content, srcpath) => {
      return content.replace(/([\s\S]+)/mg, '// DO NOT EDIT IT WILL BE OVERWRITTEN - copy of bootstrap documentation generated by gulp docs:copy-bs\n\n$1');
    }
  }),

  new Copy(gulp, docsPreset, docsConfig, {
    task: {name: 'copy:bs-docs-plugins'},
    source: {
      options: {cwd: '../bootstrap/docs/_plugins'},
      glob: ['**/*', '!bridge.rb']
    },
    dest: 'docs/_plugins/'
  }),
]


new TaskSeries(gulp, 'docs:copy-bs', bsDocs)
