import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEVICON =
  'https://frontendtales.ru/assets/806c1391-211a9e5f-91c1-412a-b689-4740a680b06e/roadmap';

interface LinkData {
  label: string;
  url: string;
  type?: string;
}

interface ItemData {
  key: string;
  iconUrl: string;
  iconAlt: string;
  links: LinkData[];
}

interface CategoryData {
  key: string;
  items: ItemData[];
}

interface SectionData {
  key: string;
  isNew?: boolean;
  categories: CategoryData[];
}

const roadmapData: SectionData[] = [
  {
    key: 'fundamentals',
    categories: [
      {
        key: 'html',
        items: [
          {
            key: 'html-syntax',
            iconUrl: `${DEVICON}/html/html.svg`,
            iconAlt: 'HTML5',
            links: [
              {
                label: 'W3Schools HTML',
                url: 'https://www.w3schools.com/html/',
                type: 'article',
              },
              {
                label: 'HTML5 Specification',
                url: 'https://html.spec.whatwg.org/multipage/',
                type: 'docs',
              },
              {
                label: 'Learn HTML',
                url: 'https://www.codecademy.com/learn/learn-html',
                type: 'course',
              },
              {
                label: 'Structuring content with HTML',
                url: 'https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Structuring_content',
                type: 'article',
              },
              {
                label: 'Что такое html',
                url: 'https://www.youtube.com/watch?v=MBe1h80ghKA',
                type: 'video',
              },
            ],
          },
          {
            key: 'html-tags',
            iconUrl: `${DEVICON}/html/tag.svg`,
            iconAlt: 'HTML5',
            links: [
              {
                label: 'MDN - HTML elements reference',
                url: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements',
                type: 'docs',
              },
              {
                label:
                  'HTML Basic Tags: A Guide for Complete Beginners with Examples',
                url: 'https://www.tutorialspoint.com/html/html_basic_tags.htm',
                type: 'course',
              },
              {
                label: 'Your First 10 HTML Tags',
                url: 'https://www.elated.com/first-10-html-tags/',
                type: 'article',
              },
              {
                label: 'HTML Element Reference',
                url: 'https://www.w3schools.com/tags/ref_byfunc.asp',
                type: 'docs',
              },
              {
                label: 'ДОКА - HTML',
                url: 'https://doka.guide/html/',
                type: 'article',
              },
              {
                label: 'Гайд на СЕМАНТИКУ в HTML | header, main, footer и т.д.',
                url: 'https://www.youtube.com/watch?v=MBe1h80ghKA',
                type: 'video',
              },
            ],
          },
          {
            key: 'html-form',
            iconUrl: `${DEVICON}/html/form.svg`,
            iconAlt: 'HTML5',
            links: [
              {
                label: 'MDN - Web forms',
                url: 'https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms',
                type: 'docs',
              },
              {
                label: 'Google - Learn Forms',
                url: 'https://web.dev/learn/forms/',
                type: 'course',
              },
              {
                label: 'HTML Forms',
                url: 'https://www.w3schools.com/html/html_forms.asp',
                type: 'article',
              },
              {
                label: 'Формы в HTML',
                url: 'https://webref.ru/course/html-content/forms',
                type: 'article',
              },
              {
                label: 'Learn HTML forms in 8 minutes',
                url: 'https://www.youtube.com/watch?v=2O8pkybH6po',
                type: 'video',
              },
            ],
          },
          {
            key: 'html-seo',
            iconUrl: `${DEVICON}/html/seo.svg`,
            iconAlt: 'HTML5',
            links: [
              {
                label: 'Что такое SEO',
                url: 'https://skillbox.ru/media/marketing/chto-takoe-seo-kak-rabotaet-skolko-stoit-i-kakie-rezultaty-mozhet-prinesti/',
                type: 'article',
              },
              {
                label: 'УЗНАТЬ ВСЕ про SEO за 28 минут!',
                url: 'https://www.youtube.com/watch?v=IHWZLsyeCu8',
                type: 'video',
              },
              {
                label: 'Web Dev - Easily discoverable',
                url: 'https://web.dev/explore/discoverable',
                type: 'article',
              },
              {
                label: "Get started with Search: a developer's guide",
                url: 'https://developers.google.com/search/docs/fundamentals/get-started-developers',
                type: 'article',
              },
              {
                label: 'Understand the JavaScript SEO basics',
                url: 'https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics',
                type: 'article',
              },
              {
                label: 'SEO for JavaScript applications',
                url: 'https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics',
                type: 'article',
              },
              {
                label: 'SEO-аудит',
                url: 'https://developer.chrome.com/docs/lighthouse/seo/meta-description?hl=ru',
                type: 'article',
              },
            ],
          },
          {
            key: 'html-svg',
            iconUrl: `${DEVICON}/html/svg.svg`,
            iconAlt: 'HTML5',
            links: [
              {
                label: 'Что такое SVG-графика и как с ней работать',
                url: 'https://timeweb.com/ru/community/articles/chto-takoe-svg-grafika-i-kak-s-ney-rabotat',
                type: 'article',
              },
              {
                label: 'Including vector graphics in HTML',
                url: 'https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Structuring_content/Including_vector_graphics_in_HTML',
                type: 'article',
              },
              {
                label: 'SVG',
                url: 'https://www.w3schools.com/graphics/svg_intro.asp',
                type: 'article',
              },
              {
                label: 'A Practical Guide',
                url: 'https://svgontheweb.com/',
                type: 'article',
              },
              {
                label: 'SVG за 3 Минуты',
                url: 'https://www.youtube.com/watch?v=PN0Av8QXMVo',
                type: 'video',
              },
            ],
          },
          {
            key: 'html-best-practice',
            iconUrl: `${DEVICON}/html/best_practice.svg`,
            iconAlt: 'HTML5',
            links: [
              {
                label: 'Guidelines for writing HTML code examples',
                url: 'https://developer.mozilla.org/en-US/docs/MDN/Writing_guidelines/Code_style_guide/HTML',
                type: 'article',
              },
              {
                label: 'HTML Style Guide',
                url: 'https://www.w3schools.com/html/html5_syntax.asp',
                type: 'article',
              },
              {
                label: 'HTML Best Practices',
                url: 'https://www.freecodecamp.org/news/html-best-practices/',
                type: 'article',
              },
            ],
          },
        ],
      },
      {
        key: 'css',
        items: [
          {
            key: 'css-syntax',
            iconUrl: `${DEVICON}/css/css.svg`,
            iconAlt: 'CSS3',
            links: [
              {
                label: 'MDN - Introduction to CSS syntax',
                url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Syntax/Introduction',
                type: 'docs',
              },
              {
                label: 'MDN - CSS styling basics',
                url: 'https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics',
                type: 'docs',
              },
              {
                label: 'CSS values and units',
                url: 'https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics/Values_and_units',
                type: 'docs',
              },
              {
                label: 'Базовый синтаксис CSS',
                url: 'https://htmlbook.ru/samcss/bazovyy-sintaksis-css',
                type: 'docs',
              },
              {
                label: 'CSS Tutorial',
                url: 'https://www.w3schools.com/css/default.asp',
                type: 'docs',
              },
            ],
          },
          {
            key: 'css-selectors',
            iconUrl: `${DEVICON}/css/selectors.svg`,
            iconAlt: 'CSS3',
            links: [
              {
                label: 'CSS Selectors',
                url: 'https://www.youtube.com/watch?v=IKho_xDKaLw',
                type: 'video',
              },
              {
                label: 'MDN - Basic CSS selectors',
                url: 'https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics/Basic_selectors',
                type: 'docs',
              },
              {
                label: 'MDN - CSS Selectors',
                url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Selectors',
                type: 'docs',
              },
              {
                label: 'Child and Sibling Selectors',
                url: 'https://css-tricks.com/child-and-sibling-selectors/',
                type: 'article',
              },
            ],
          },
          {
            key: 'css-specificity',
            iconUrl: `${DEVICON}/css/specificity.svg`,
            iconAlt: 'CSS3',
            links: [
              {
                label: 'Specificity',
                url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Cascade/Specificity',
                type: 'docs',
              },
              {
                label: 'Handling conflicts',
                url: 'https://css-tricks.com/specifics-on-css-specificity/',
                type: 'article',
              },
              {
                label: 'CSS Specificity',
                url: 'https://dev.to/emmabostian/css-specificity-1kca',
                type: 'article',
              },
              {
                label: 'Specificity Calculator',
                url: 'https://specificity.keegan.st/',
                type: 'article',
              },
              {
                label: 'Специфичность',
                url: 'https://doka.guide/css/specificity/',
                type: 'article',
              },
            ],
          },
          {
            key: 'css-pseudo',
            iconUrl: `${DEVICON}/css/pseudo.svg`,
            iconAlt: 'CSS3',
            links: [
              {
                label: 'MDN - Pseudo-classes',
                url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/Pseudo-classes',
                type: 'docs',
              },
              {
                label: 'Meet the Pseudo Class Selectors',
                url: 'https://css-tricks.com/pseudo-class-selectors/',
                type: 'article',
              },
              {
                label:
                  'When do the :hover, :focus, and :active pseudo-classes apply?',
                url: 'https://bitsofco.de/when-do-the-hover-focus-and-active-pseudo-classes-apply/',
                type: 'article',
              },
              {
                label: 'CSS Pseudo-elements',
                url: 'https://www.w3schools.com/css/css_pseudo_elements.asp',
                type: 'docs',
              },
              {
                label: 'Псевдоэлементы в CSS',
                url: 'https://blog.skillfactory.ru/psevdoelementy-v-css-chto-eto-i-zachem-oni-nuzhny/',
                type: 'article',
              },
            ],
          },
          {
            key: 'css-boxmodel',
            iconUrl: `${DEVICON}/css/box_model.svg`,
            iconAlt: 'CSS3',
            links: [
              {
                label: 'MDN - Introduction to the CSS box model',
                url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Box_model/Introduction',
                type: 'docs',
              },
              {
                label: 'MDN - The box model',
                url: 'https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics/Box_model',
                type: 'docs',
              },
              {
                label:
                  'Inheriting box-sizing Probably Slightly Better Best-Practice',
                url: 'https://css-tricks.com/inheriting-box-sizing-probably-slightly-better-best-practice/',
                type: 'article',
              },
              {
                label: 'Блочная модель',
                url: 'https://doka.guide/css/box-model/',
                type: 'article',
              },
            ],
          },
          {
            key: 'css-collapsing',
            iconUrl: `${DEVICON}/css/margin.svg`,
            iconAlt: 'CSS3',
            links: [
              {
                label: 'MDN - Mastering margin collapsing',
                url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Box_model/Margin_collapsing',
                type: 'docs',
              },
              {
                label: 'Margin Collapse in CSS: What, Why, and How',
                url: 'https://medium.com/@joseph0crick/margin-collapse-in-css-what-why-and-how-328c10e37ca0',
                type: 'article',
              },
              {
                label: 'What You Should Know About Collapsing Margins',
                url: 'https://css-tricks.com/what-you-should-know-about-collapsing-margins/',
                type: 'article',
              },
              {
                label: "What's the Deal with Collapsible Margins?",
                url: 'https://bitsofco.de/collapsible-margins/',
                type: 'article',
              },
              {
                label: 'Что такое margin collapsing в CSS',
                url: 'https://htmlacademy.ru/blog/css/margin',
                type: 'article',
              },
            ],
          },
          {
            key: 'css-calc',
            iconUrl: `${DEVICON}/css/calc.svg`,
            iconAlt: 'CSS3',
            links: [
              {
                label: 'MDN - calc()',
                url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/calc',
                type: 'docs',
              },
              {
                label: 'A Couple of Use Cases for Calc()',
                url: 'https://css-tricks.com/a-couple-of-use-cases-for-calc/',
                type: 'article',
              },
              {
                label: 'CSS: полное руководство по функции calc()',
                url: 'https://habr.com/ru/companies/ruvds/articles/493660/',
                type: 'article',
              },
            ],
          },
          {
            key: 'css-layout',
            iconUrl: `${DEVICON}/css/layout.svg`,
            iconAlt: 'CSS3',
            links: [
              {
                label: 'CSS Website Layout',
                url: 'https://www.w3schools.com/css/css_website_layout.asp',
                type: 'docs',
              },
              {
                label: 'CSS layout',
                url: 'https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout',
                type: 'docs',
              },
              {
                label: 'MDN - Structuring documents',
                url: 'https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Structuring_content/Structuring_documents',
                type: 'docs',
              },
              {
                label: 'CSS Layout Generator',
                url: 'https://layout.bradwoods.io/',
              },
              {
                label: 'Layout',
                url: 'https://web.dev/learn/css/layout',
                type: 'article',
              },
            ],
          },
          {
            key: 'css-flex',
            iconUrl: `${DEVICON}/css/flex.svg`,
            iconAlt: 'CSS3',
            links: [
              {
                label: 'MDN - Flexbox',
                url: 'https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Flexbox',
                type: 'docs',
              },
              {
                label: 'MDN - Basic concepts of flexbox',
                url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Flexible_box_layout/Basic_concepts',
                type: 'docs',
              },
              {
                label: 'CSS Flexbox Layout Guide',
                url: 'https://css-tricks.com/snippets/css/a-guide-to-flexbox/',
                type: 'article',
              },
              { label: 'Flexbox Froggy', url: 'https://flexboxfroggy.com/' },
              {
                label: 'Flexbox Defense',
                url: 'http://www.flexboxdefense.com/',
              },
              {
                label: 'Гайд по flexbox — CSS',
                url: 'https://doka.guide/css/flexbox-guide/',
                type: 'article',
              },
              {
                label: 'Полное руководство по Flexbox',
                url: 'https://habr.com/ru/articles/467049/',
                type: 'article',
              },
            ],
          },
          {
            key: 'css-grid',
            iconUrl: `${DEVICON}/css/grid.svg`,
            iconAlt: 'CSS3',
            links: [
              {
                label: 'MDN - CSS grid layout 1',
                url: 'https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Grids',
                type: 'docs',
              },
              {
                label: 'MDN - CSS grid layout 2',
                url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Grid_layout',
                type: 'docs',
              },
              {
                label: 'CSS Grid Layout Guide',
                url: 'https://css-tricks.com/complete-guide-css-grid-layout/',
                type: 'article',
              },
              { label: 'Grid Garden', url: 'https://cssgridgarden.com/' },
              {
                label: 'CSS Grid - Supercharged',
                url: 'https://www.youtube.com/watch?v=AqwPrR7hklE',
                type: 'video',
              },
              {
                label: 'Гайд по grid',
                url: 'https://doka.guide/css/grid-guide/',
                type: 'article',
              },
            ],
          },
          {
            key: 'css-transformation',
            iconUrl: `${DEVICON}/css/transformation.svg`,
            iconAlt: 'CSS3',
            links: [
              {
                label: 'MDN - transform',
                url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/transform',
                type: 'docs',
              },
              {
                label: 'CSS transform',
                url: 'https://css-tricks.com/almanac/properties/t/transform/',
                type: 'article',
              },
              {
                label: 'Функции CSS-трансформации',
                url: 'https://doka.guide/css/transform-function/',
                type: 'docs',
              },
            ],
          },
          {
            key: 'css-animations',
            iconUrl: `${DEVICON}/css/animation.svg`,
            iconAlt: 'CSS3',
            links: [
              {
                label: 'MDN - Using CSS animations',
                url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Animations/Using',
                type: 'docs',
              },
              {
                label: 'animation',
                url: 'https://css-tricks.com/almanac/properties/a/animation/',
                type: 'docs',
              },
            ],
          },
          {
            key: 'css-responsive',
            iconUrl: `${DEVICON}/css/responsive.svg`,
            iconAlt: 'CSS3',
            links: [
              {
                label: 'MDN - Responsive web design',
                url: 'https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Responsive_Design',
                type: 'docs',
              },
              {
                label: 'Responsive Web Design Fundamentals',
                url: 'https://www.udacity.com/course/responsive-web-design-fundamentals--ud893',
                type: 'course',
              },
              {
                label: 'Responsive web design basics',
                url: 'https://web.dev/articles/responsive-web-design-basics',
                type: 'article',
              },
              {
                label: 'Learn Responsive Design',
                url: 'https://web.dev/learn/design',
                type: 'course',
              },
              {
                label: 'Multi-device content',
                url: 'https://web.dev/articles/multi-device-content',
                type: 'article',
              },
            ],
          },
          {
            key: 'css-mediaqueries',
            iconUrl: `${DEVICON}/css/media.svg`,
            iconAlt: 'CSS3',
            links: [
              {
                label: 'MDN - Using media queries',
                url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Using',
                type: 'docs',
              },
              {
                label: 'MDN - Using media queries for accessibility',
                url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Using_for_accessibility',
                type: 'docs',
              },
              {
                label: 'CSS Media Queries & Using Available Space',
                url: 'https://css-tricks.com/css-media-queries/',
                type: 'article',
              },
            ],
          },
          {
            key: 'css-units',
            iconUrl: `${DEVICON}/css/relative_units.svg`,
            iconAlt: 'CSS3',
            links: [
              {
                label: 'MDN - Sizing items in CSS',
                url: 'https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics/Sizing',
                type: 'docs',
              },
              {
                label: 'MDN - CSS values and units',
                url: 'https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics/Values_and_units',
                type: 'docs',
              },
              {
                label: 'Fun with Viewport Units',
                url: 'https://css-tricks.com/fun-viewport-units/',
                type: 'article',
              },
              {
                label:
                  '15 CSS Relative units, how many do you know? em, rem, ex, cap, ch, ic...',
                url: 'https://dev.to/bytegasm/15-css-relative-units-how-many-do-you-know-em-rem-ex-cap-ch-ic-6m',
                type: 'article',
              },
            ],
          },
          {
            key: 'css-colors',
            iconUrl: `${DEVICON}/css/colors.svg`,
            iconAlt: 'CSS3',
            links: [
              {
                label: 'MDN - color',
                url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/color',
                type: 'docs',
              },
              {
                label: 'MDN - <color>',
                url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/color_value',
                type: 'docs',
              },
              {
                label: 'CSS Colors',
                url: 'https://www.w3schools.com/css/css_colors.asp',
                type: 'docs',
              },
            ],
          },
          {
            key: 'css-images',
            iconUrl: `${DEVICON}/css/images.svg`,
            iconAlt: 'CSS3',
            links: [
              {
                label: 'Responsive images',
                url: 'https://web.dev/articles/responsive-images',
                type: 'article',
              },
              {
                label: 'MDN - Using responsive images in HTML',
                url: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Responsive_images',
                type: 'docs',
              },
            ],
          },
          {
            key: 'css-variables',
            iconUrl: `${DEVICON}/css/variables.svg`,
            iconAlt: 'CSS3',
            links: [
              {
                label: 'MDN - Using CSS custom properties (variables)',
                url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Cascading_variables/Using_custom_properties',
                type: 'docs',
              },
              {
                label: 'CSS-переменные: почему вас это должно волновать?',
                url: 'https://developer.chrome.com/blog/css-variables-why-should-you-care?hl=ru',
                type: 'article',
              },
              {
                label: 'CSS Variables explained with 5 examples',
                url: 'https://codeburst.io/css-variables-explained-with-5-examples-84adaffaa5bd',
                type: 'article',
              },
            ],
          },
          {
            key: 'css-best-practice',
            iconUrl: `${DEVICON}/html/best_practice.svg`,
            iconAlt: 'CSS3',
            links: [
              {
                label: 'Guidelines for writing CSS code examples',
                url: 'https://developer.mozilla.org/en-US/docs/MDN/Writing_guidelines/Code_style_guide/CSS',
                type: 'docs',
              },
              {
                label: 'Organizing your CSS',
                url: 'https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics/Organizing',
                type: 'docs',
              },
              {
                label: 'The Good & Bad CSS Practices for Beginners',
                url: 'https://speckyboy.com/good-bad-css-practices/',
                type: 'article',
              },
            ],
          },
        ],
      },
      {
        key: 'javascript',
        items: [
          {
            key: 'js-syntax',
            iconUrl: `${DEVICON}/js/js.svg`,
            iconAlt: 'JavaScript',
            links: [
              {
                label: 'MDN - Javascript First Steps',
                url: 'https://developer.mozilla.org/en-US/docs/Learn/JavaScript/First_steps',
                type: 'docs',
              },
              {
                label: 'MDN - Adding interactivity',
                url: 'https://developer.mozilla.org/en-US/docs/Learn_web_development/Getting_started/Your_first_website/Adding_interactivity',
                type: 'docs',
              },
              {
                label: 'Learn JavaScript',
                url: 'https://learn.javascript.ru/',
                type: 'docs',
              },
              {
                label: 'Основы JavaScript',
                url: 'https://developer.mozilla.org/ru/docs/Learn_web_development/Getting_started/Your_first_website/Adding_interactivity',
                type: 'docs',
              },
              {
                label: 'JavaScript Tutorial',
                url: 'https://www.javascripttutorial.net/',
                type: 'docs',
              },
            ],
          },
          {
            key: 'js-dom',
            iconUrl: `${DEVICON}/js/dom.svg`,
            iconAlt: 'JavaScript',
            links: [
              {
                label: 'MDN - Document Object Model (DOM)',
                url: 'https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model',
                type: 'docs',
              },
              {
                label: "Freecodecamp - What's the DOM",
                url: 'https://www.freecodecamp.org/news/whats-the-document-object-model-and-why-you-should-know-how-to-use-it-1a2d0bc5429d/',
                type: 'article',
              },
              {
                label: 'DOM',
                url: 'https://blog.skillfactory.ru/glossary/dom/',
                type: 'article',
              },
              {
                label: 'DOM-дерево',
                url: 'https://learn.javascript.ru/dom-nodes',
                type: 'article',
              },
            ],
          },
          {
            key: 'js-dom-manipulation',
            iconUrl: `${DEVICON}/js/dom-manipulation.svg`,
            iconAlt: 'JavaScript',
            links: [
              {
                label: 'MDN - Locating DOM elements using selectors',
                url: 'https://developer.mozilla.org/en-US/docs/Web/API/Document_object_model/Locating_DOM_elements_using_selectors',
                type: 'docs',
              },
              {
                label: 'Supercharged - querySelector',
                url: 'https://www.youtube.com/watch?v=s0vg_H9hBuU',
                type: 'video',
              },
              {
                label: 'Манипуляции с DOM в JavaScript',
                url: 'https://result.school/roadmap/frontend/article/dom-manipulation',
                type: 'article',
              },
              {
                label: 'DOM Manipulation and Events',
                url: 'https://www.theodinproject.com/lessons/foundations-dom-manipulation-and-events',
                type: 'article',
              },
            ],
          },
          {
            key: 'js-events',
            iconUrl: `${DEVICON}/js/events.svg`,
            iconAlt: 'JavaScript',
            links: [
              {
                label: 'MDN - Introduction to events',
                url: 'https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events',
                type: 'docs',
              },
              {
                label: 'MDN - DOM events',
                url: 'https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Events',
                type: 'docs',
              },
              {
                label:
                  'Freecodecamp - A simplified explanation of event propagation',
                url: 'https://www.freecodecamp.org/news/a-simplified-explanation-of-event-propagation-in-javascript-f9de7961a06e/',
                type: 'article',
              },
              {
                label: 'Browser events: Handling events',
                url: 'https://thevalleyofcode.com/lesson/browser-events/handling-events/',
                type: 'article',
              },
              {
                label: 'MDN - addEventListener()',
                url: 'https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener',
                type: 'docs',
              },
              {
                label: 'MDN - removeEventListener()',
                url: 'https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/removeEventListener',
                type: 'docs',
              },
              {
                label: 'Event order',
                url: 'https://www.quirksmode.org/js/events_order.html',
                type: 'article',
              },
              {
                label: 'Введение в браузерные события',
                url: 'https://learn.javascript.ru/introduction-browser-events',
                type: 'article',
              },
            ],
          },
          {
            key: 'js-objects',
            iconUrl: `${DEVICON}/js/objects.svg`,
            iconAlt: 'JavaScript',
            links: [
              {
                label: 'MDN - Working with objects',
                url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Working_with_Objects',
                type: 'docs',
              },
              {
                label: 'Объекты',
                url: 'https://learn.javascript.ru/object',
                type: 'article',
              },
              {
                label: 'MDN - this',
                url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this',
                type: 'docs',
              },
              {
                label: 'MDN - bind()',
                url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/bind',
                type: 'docs',
              },
              {
                label: 'MDN - new operator',
                url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/new',
                type: 'docs',
              },
              {
                label: 'MDN - new.target',
                url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/new.target',
                type: 'docs',
              },
              {
                label: 'Advanced JavaScript objects',
                url: 'https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Advanced_JavaScript_objects',
                type: 'docs',
              },
              {
                label: 'Объект',
                url: 'https://doka.guide/js/object/',
                type: 'docs',
              },
            ],
          },
          {
            key: 'js-spread-rest',
            iconUrl: `${DEVICON}/js/spread-rest.svg`,
            iconAlt: 'JavaScript',
            links: [
              {
                label: 'MDN - Spread syntax',
                url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax',
                type: 'docs',
              },
              {
                label: 'Freecodecamp - An introduction to Spread syntax',
                url: 'https://www.freecodecamp.org/news/an-introduction-to-spread-syntax-in-javascript-fba39595922c/',
                type: 'article',
              },
              {
                label: 'Object rest and spread properties',
                url: 'https://v8.dev/features/object-rest-spread',
                type: 'article',
              },
              {
                label: 'Спред-синтаксис ...',
                url: 'https://doka.guide/js/spread/',
                type: 'article',
              },
            ],
          },
          {
            key: 'js-destructuring',
            iconUrl: `${DEVICON}/js/destructuring.svg`,
            iconAlt: 'JavaScript',
            links: [
              {
                label: 'MDN - Destructuring assignment',
                url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment',
                type: 'docs',
              },
              {
                label: 'MDN - ES6 In Depth: Destructuring',
                url: 'https://hacks.mozilla.org/2015/05/es6-in-depth-destructuring/',
                type: 'docs',
              },
              {
                label: 'javascript.info - Destructuring assignment',
                url: 'https://javascript.info/destructuring-assignment',
                type: 'article',
              },
              {
                label: 'Деструктуризация',
                url: 'https://doka.guide/js/destructuring-assignment/',
                type: 'article',
              },
            ],
          },
          {
            key: 'js-classes',
            iconUrl: `${DEVICON}/js/classes.svg`,
            iconAlt: 'JavaScript',
            links: [
              {
                label: 'MDN - Classes',
                url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes',
                type: 'docs',
              },
              {
                label: 'MDN - Inheritance',
                url: 'https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Objects/Inheritance',
                type: 'docs',
              },
              {
                label: 'MDN - Object Oriented Programming',
                url: 'https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Objects/Object-oriented_JS',
                type: 'docs',
              },
              {
                label: 'MDN - super',
                url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/super',
                type: 'docs',
              },
              {
                label: 'Классы',
                url: 'https://learn.javascript.ru/classes',
                type: 'docs',
              },
              {
                label: 'JavaScript: полное руководство по классам',
                url: 'https://habr.com/ru/articles/518386/',
                type: 'article',
              },
            ],
          },
          {
            key: 'js-prototypes',
            iconUrl: `${DEVICON}/js/prototypes.svg`,
            iconAlt: 'JavaScript',
            links: [
              {
                label: 'The prototype chain',
                url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Inheritance_and_the_prototype_chain',
                type: 'article',
              },
              {
                label: 'Prototypes in JavaScript',
                url: 'https://medium.com/better-programming/prototypes-in-javascript-5bba2990e04b',
                type: 'article',
              },
              {
                label: 'dev.to - JavaScript Visualized: Prototypal Inheritance',
                url: 'https://dev.to/lydiahallie/javascript-visualized-prototypal-inheritance-47co',
                type: 'article',
              },
              {
                label: 'Прототипы в JS и малоизвестные факты',
                url: 'https://habr.com/ru/articles/518360/',
                type: 'article',
              },
            ],
          },
          {
            key: 'js-regex',
            iconUrl: `${DEVICON}/js/regex.svg`,
            iconAlt: 'JavaScript',
            links: [
              {
                label: 'MDN - Regular Expressions',
                url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions',
                type: 'docs',
              },
              {
                label: 'Регулярные выражения',
                url: 'https://learn.javascript.ru/regular-expressions',
                type: 'article',
              },
              {
                label: 'MDN - RegExp',
                url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp',
                type: 'docs',
              },
              {
                label: 'The ultimate JavaScript regex guide',
                url: 'https://www.honeybadger.io/blog/javascript-regular-expressions/',
                type: 'article',
              },
            ],
          },
          {
            key: 'js-callbacks',
            iconUrl: `${DEVICON}/js/callbacks.svg`,
            iconAlt: 'JavaScript',
            links: [
              {
                label: 'MDN - Callback function',
                url: 'https://developer.mozilla.org/en-US/docs/Glossary/Callback_function',
                type: 'docs',
              },
              {
                label: 'JavaScript: What the heck is a Callback?',
                url: 'https://codeburst.io/javascript-what-the-heck-is-a-callback-aba4da2deced',
                type: 'article',
              },
              {
                label: 'Callbacks',
                url: 'https://learn.javascript.ru/callbacks',
                type: 'article',
              },
              {
                label:
                  'Асинхронный JavaScript – Callbacks, Promises и Async/Await',
                url: 'https://ivan-shamaev.ru/asynchronous-javascript-callbacks-promises-and-async-await/',
                type: 'article',
              },
            ],
          },
          {
            key: 'js-promises',
            iconUrl: `${DEVICON}/js/promises.svg`,
            iconAlt: 'JavaScript',
            links: [
              {
                label: 'Google Devs - JavaScript Promises: an Introduction',
                url: 'https://developers.google.com/web/fundamentals/primers/promises',
                type: 'article',
              },
              {
                label: 'MDN - Promise',
                url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise',
                type: 'docs',
              },
              {
                label: 'Master the JavaScript Interview: What is a Promise?',
                url: 'https://medium.com/javascript-scene/master-the-javascript-interview-what-is-a-promise-27fc71e77261',
                type: 'article',
              },
              {
                label: 'Promise',
                url: 'https://doka.guide/js/promise/',
                type: 'article',
              },
              {
                label:
                  'Асинхронный JavaScript – Callbacks, Promises и Async/Await',
                url: 'https://ivan-shamaev.ru/asynchronous-javascript-callbacks-promises-and-async-await/',
                type: 'article',
              },
            ],
          },
          {
            key: 'js-async-await',
            iconUrl: `${DEVICON}/js/async-await.svg`,
            iconAlt: 'JavaScript',
            links: [
              {
                label: 'MDN - async function',
                url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function',
                type: 'docs',
              },
              {
                label: 'Async/await',
                url: 'https://learn.javascript.ru/async-await',
                type: 'article',
              },
              {
                label:
                  'Асинхронный JavaScript – Callbacks, Promises и Async/Await',
                url: 'https://ivan-shamaev.ru/asynchronous-javascript-callbacks-promises-and-async-await/',
                type: 'article',
              },
              {
                label: 'async/await',
                url: 'https://doka.guide/js/async-await/',
                type: 'article',
              },
            ],
          },
          {
            key: 'js-fetch',
            iconUrl: `${DEVICON}/js/fetch.svg`,
            iconAlt: 'JavaScript',
            links: [
              {
                label: 'Google Devs - Introduction to fetch',
                url: 'https://developers.google.com/web/updates/2015/03/introduction-to-fetch',
                type: 'article',
              },
              {
                label: 'Freecodecamp - Fetch practical guide',
                url: 'https://www.freecodecamp.org/news/a-practical-es6-guide-on-how-to-perform-http-requests-using-the-fetch-api-594c3d91a547/',
                type: 'article',
              },
              {
                label: 'MDN - CORS',
                url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS',
                type: 'docs',
              },
              {
                label: 'Alligator - Fetch API',
                url: 'https://alligator.io/js/fetch-api/',
                type: 'article',
              },
              {
                label: 'Supercharged - Fetch',
                url: 'https://www.youtube.com/watch?v=GiI77ya60yk',
                type: 'article',
              },
              {
                label: 'Fetch',
                url: 'https://learn.javascript.ru/fetch',
                type: 'article',
              },
              {
                label: 'Потоковая передача запросов с помощью Fetch API',
                url: 'https://web.dev/articles/fetch-upload-streaming?hl=ru',
                type: 'article',
              },
            ],
          },
          {
            key: 'js-template-literals',
            iconUrl: `${DEVICON}/js/template.svg`,
            iconAlt: 'JavaScript',
            links: [
              {
                label: 'MDN - Template literals',
                url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals',
                type: 'docs',
              },
              {
                label: 'MDN - ES6 In Depth: Template strings',
                url: 'https://hacks.mozilla.org/2015/05/es6-in-depth-template-strings-2/',
                type: 'docs',
              },
              {
                label:
                  'Google Devs - Getting Literal With ES6 Template Strings',
                url: 'https://developers.google.com/web/updates/2015/01/ES6-Template-Strings',
                type: 'article',
              },
            ],
          },
          {
            key: 'js-web-animations',
            iconUrl: `${DEVICON}/js/animation.svg`,
            iconAlt: 'JavaScript',
            links: [
              {
                label: 'Google Devs - Animations',
                url: 'https://developers.google.com/web/fundamentals/design-and-ux/animations',
                type: 'article',
              },
              {
                label: 'MDN - Using The Web Animations API',
                url: 'https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API/Using_the_Web_Animations_API',
                type: 'docs',
              },
              {
                label: 'CSS Tricks - CSS Animations vs Web Animations API',
                url: 'https://css-tricks.com/css-animations-vs-web-animations-api/',
                type: 'article',
              },
              {
                label: 'JavaScript-анимации',
                url: 'https://learn.javascript.ru/js-animation',
                type: 'article',
              },
            ],
          },
          {
            key: 'js-web-modules',
            iconUrl: `${DEVICON}/js/module.svg`,
            iconAlt: 'JavaScript',
            links: [
              {
                label: 'MDN - Export',
                url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/export',
                type: 'docs',
              },
              {
                label: 'MDN - Import',
                url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import',
                type: 'docs',
              },
              {
                label: 'V8 - Modules',
                url: 'https://v8.dev/features/modules',
                type: 'article',
              },
              {
                label: 'Freecodecamp - A Practical guide to ES6 modules',
                url: 'https://www.freecodecamp.org/news/how-to-use-es6-modules-and-why-theyre-important-a9b20b480773/',
                type: 'article',
              },
              {
                label: 'Модули в JavaScript',
                url: 'https://habr.com/ru/companies/domclick/articles/532084/',
                type: 'article',
              },
            ],
          },
          {
            key: 'js-intl',
            iconUrl: `${DEVICON}/js/intl.svg`,
            iconAlt: 'JavaScript',
            links: [
              {
                label: 'MDN - Intl',
                url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl',
                type: 'docs',
              },
              {
                label: 'MDN - Date Time Format',
                url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DateTimeFormat',
                type: 'docs',
              },
              {
                label: 'New Intl APIs in JavaScript',
                url: 'https://blog.bitsrc.io/new-intl-apis-in-javascript-c50dc89d2cf3',
                type: 'article',
              },
            ],
          },
          {
            key: 'js-canvas',
            iconUrl: `${DEVICON}/js/canvas.svg`,
            iconAlt: 'JavaScript',
            links: [
              {
                label: 'MDN - Canvas tutorial',
                url: 'https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial',
                type: 'docs',
              },
              {
                label: 'MDN - Canvas API',
                url: 'https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API',
                type: 'docs',
              },
              {
                label: 'CSS Tricks - Manipulating Pixels Using Canvas',
                url: 'https://css-tricks.com/manipulating-pixels-using-canvas/',
                type: 'article',
              },
              {
                label: 'CANVAS шаг за шагом: Основы',
                url: 'https://habr.com/ru/articles/111308/',
                type: 'article',
              },
            ],
          },
          {
            key: 'js-web-workers',
            iconUrl: `${DEVICON}/js/web-worker.svg`,
            iconAlt: 'JavaScript',
            links: [
              {
                label: 'MDN - Using Web Workers',
                url: 'https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers',
                type: 'docs',
              },
              {
                label: 'Web Workers',
                url: 'https://doka.guide/js/web-workers/',
                type: 'article',
              },
              {
                label: 'An overview of web workers',
                url: 'https://web.dev/learn/performance/web-worker-overview',
                type: 'article',
              },
            ],
          },
          {
            key: 'js-best-practice',
            iconUrl: `${DEVICON}/html/best_practice.svg`,
            iconAlt: 'JavaScript',
            links: [
              {
                label: 'MDN - JavaScript guidelines',
                url: 'https://developer.mozilla.org/en-US/docs/MDN/Contribute/Guidelines/Code_guidelines/JavaScript',
                type: 'docs',
              },
              {
                label: 'Airbnb - JavaScript Style Guide',
                url: 'https://github.com/airbnb/javascript',
                type: 'article',
              },
              {
                label:
                  'Принципы написания консистентного, идиоматического кода на JavaScript',
                url: 'https://github.com/rwaldron/idiomatic.js/tree/master/translations/ru_RU',
                type: 'article',
              },
              {
                label: '5 JavaScript Style Guides',
                url: 'https://codeburst.io/5-javascript-style-guides-including-airbnb-github-google-88cbc6b2b7aa',
                type: 'article',
              },
              {
                label: 'JavaScript Style Guide and Coding Conventions',
                url: 'https://www.w3schools.com/js/js_conventions.asp',
                type: 'article',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    key: 'build-tools',
    isNew: true,
    categories: [
      {
        key: 'tools',
        items: [
          {
            key: 'package-managers',
            iconUrl: `${DEVICON}/build-tools/package-manager.svg`,
            iconAlt: 'JavaScript',
            links: [
              {
                label:
                  'An introduction to how JavaScript package managers work',
                url: 'https://www.freecodecamp.org/news/javascript-package-managers-101-9afd926add0a/',
                type: 'article',
              },
              {
                label: 'A Practical Guide to Frontend Package Managers',
                url: 'https://www.fe.engineer/handbook/package-managers',
                type: 'article',
              },
              {
                label: 'Every Package Manager Explained in 8 Minutes',
                url: 'https://www.youtube.com/watch?v=QWkHQ6ifKm0',
                type: 'video',
              },
              {
                label: 'Пакетные менеджеры',
                url: 'https://doka.guide/tools/package-managers/',
                type: 'article',
              },
            ],
          },
          {
            key: 'npm',
            iconUrl: `${DEVICON}/build-tools/npm.svg`,
            iconAlt: 'JavaScript',
            links: [
              {
                label: 'About npm',
                url: 'https://docs.npmjs.com/about-npm',
                type: 'docs',
              },
              {
                label: 'Getting started',
                url: 'https://docs.npmjs.com/getting-started',
                type: 'docs',
              },
              {
                label: 'Introduction to npm and basic npm commands',
                url: 'https://medium.com/beginners-guide-to-mobile-web-development/introduction-to-npm-and-basic-npm-commands-18aa16f69f6b',
                type: 'article',
              },
              {
                label: "An Absolute Beginner's Guide to Using npm",
                url: 'https://nodesource.com/blog/an-absolute-beginners-guide-to-using-npm',
                type: 'article',
              },
              {
                label: 'Шпаргалка по пакетному менеджеру NPM',
                url: 'https://habr.com/ru/articles/133363/',
                type: 'article',
              },
            ],
          },
          {
            key: 'pnpm',
            iconUrl: `${DEVICON}/build-tools/pnpm.svg`,
            iconAlt: 'JavaScript',
            links: [
              {
                label: 'What is pnpm?',
                url: 'https://pnpm.io/motivation',
                type: 'docs',
              },
              {
                label: 'Пожалуйста, начните использовать pnpm',
                url: 'https://habr.com/ru/articles/587254/',
                type: 'article',
              },
              {
                label:
                  'Why I Switched to pnpm (And Why You Probably Should Too)',
                url: 'https://medium.com/@akhshyganesh/why-i-switched-to-pnpm-and-why-you-probably-should-too-75a7ab840632',
                type: 'article',
              },
            ],
          },
          {
            key: 'yarn',
            iconUrl: `${DEVICON}/build-tools/yarn.svg`,
            iconAlt: 'JavaScript',
            links: [
              {
                label: 'What is Yarn?',
                url: 'https://yarnpkg.com/getting-started',
                type: 'docs',
              },
              {
                label: 'Yarn: оптимальное управление пакетами',
                url: 'https://result.school/roadmap/frontend/article/yarn',
                type: 'article',
              },
              {
                label:
                  'Yarn: The Next Generation Package Manager for Front-End Development',
                url: 'https://www.paulserban.eu/blog/post/yarn-the-next-generation-package-manager-for-front-end-development/',
                type: 'article',
              },
              {
                label:
                  'Что такое менеджер пакетов, и в чем разница YARN, NPM, PNPM?',
                url: 'https://habr.com/ru/articles/726096/',
                type: 'article',
              },
            ],
          },
          {
            key: 'rollup',
            iconUrl: `${DEVICON}/build-tools/rollup.svg`,
            iconAlt: 'JavaScript',
            links: [
              {
                label: 'What is Rollup?',
                url: 'https://rollupjs.org/introduction/',
                type: 'docs',
              },
              {
                label: 'Rollup',
                url: 'https://doka.guide/tools/rollup/',
                type: 'article',
              },
              {
                label: 'Mastering Rollup.js: From Basics to Advanced',
                url: 'https://dev.to/leapcell/mastering-rollupjs-from-basics-to-advanced-2id3',
                type: 'article',
              },
              {
                label:
                  'The Ultimate Guide to Getting Started with the Rollup.js JavaScript Bundler',
                url: 'https://medium.com/stackanatomy/the-ultimate-guide-to-getting-started-with-the-rollup-js-javascript-bundler-2ebec9398656',
                type: 'article',
              },
            ],
          },
          {
            key: 'webpack',
            iconUrl: `${DEVICON}/build-tools/webpack.svg`,
            iconAlt: 'JavaScript',
            links: [
              {
                label: 'What is Webpack?',
                url: 'https://webpack.js.org/concepts/',
                type: 'docs',
              },
              {
                label: 'What is Webpack?',
                url: 'https://medium.com/@piyushsingh0992/what-is-webpack-f6f7059daf81',
                type: 'article',
              },
              {
                label: 'What Is Webpack Loader And Plugin?',
                url: 'https://www.explainthis.io/en/swe/webpack-loader-plugin',
                type: 'article',
              },
              {
                label: 'Webpack: руководство для начинающих',
                url: 'https://habr.com/ru/articles/514838/',
                type: 'article',
              },
              {
                label: 'Webpack Basics for Beginners',
                url: 'https://daily.dev/blog/webpack-basics-for-beginners',
                type: 'article',
              },
            ],
          },
          {
            key: 'parcel',
            iconUrl: `${DEVICON}/build-tools/parcel.svg`,
            iconAlt: 'JavaScript',
            links: [
              {
                label: 'Building a web app with Parcel',
                url: 'https://parceljs.org/getting-started/webapp/',
                type: 'docs',
              },
              {
                label: 'What is Parcel JS ?',
                url: 'https://dev.to/mayank0508/what-is-parcel-js-4bfj',
                type: 'article',
              },
              {
                label: 'Parcel — мой любимый сборщик проектов',
                url: 'https://habr.com/ru/companies/ruvds/articles/473764/',
                type: 'article',
              },
              {
                label: 'Parcel — All You need to know as a Software Engineer',
                url: 'https://medium.com/@parthchovatiya/parcel-all-you-need-to-know-as-a-software-engineer-8a7f463f15b3',
                type: 'article',
              },
            ],
          },
          {
            key: 'vite',
            iconUrl: `${DEVICON}/build-tools/vite.svg`,
            iconAlt: 'JavaScript',
            links: [
              { label: 'Vite', url: 'https://vite.dev/', type: 'docs' },
              {
                label: 'Easy Explanation about Vite',
                url: 'https://medium.com/@gmmicky1026/easy-explanation-about-vite-8a6493731fc4',
                type: 'article',
              },
              {
                label: 'Why Vite',
                url: 'https://vite.dev/guide/why',
                type: 'article',
              },
              {
                label: 'Vite.js: что это и зачем нужно веб-разработчику',
                url: 'https://liquidhub.ru/blogs/blog/vite-js',
                type: 'article',
              },
              {
                label: 'Что такое Vite и зачем его используют',
                url: 'https://vverh.digital/blog/what-is-vite-chto-takoe/',
                type: 'article',
              },
            ],
          },
          {
            key: 'babel',
            iconUrl: `${DEVICON}/build-tools/babel.svg`,
            iconAlt: 'JavaScript',
            links: [
              {
                label: 'What is Babel?',
                url: 'https://babeljs.io/docs/',
                type: 'docs',
              },
              {
                label: 'What is Babel and How does it work?',
                url: 'https://mohammadtaheri.medium.com/what-is-babel-and-how-does-it-work-2cd18311980d',
                type: 'article',
              },
              {
                label: 'Что такое Babel в JavaScript?',
                url: 'https://itproger.com/spravka/javascript/babel',
                type: 'article',
              },
            ],
          },
          {
            key: 'module-bundlers',
            iconUrl: `${DEVICON}/build-tools/module-bundler.svg`,
            iconAlt: 'JavaScript',
            links: [
              {
                label: 'What is module bundler and how does it work?',
                url: 'https://dev.to/tanhauhau/what-is-module-bundler-and-how-does-it-work-3gp2',
                type: 'article',
              },
              {
                label:
                  "Let's learn how module bundlers work and then write one ourselves",
                url: 'https://www.freecodecamp.org/news/lets-learn-how-module-bundlers-work-and-then-write-one-ourselves-b2e3fe6c88ae/',
                type: 'article',
              },
              {
                label: 'JavaScript Bundlers, a Comparison',
                url: 'https://medium.com/@ajmeyghani/javascript-bundlers-a-comparison-e63f01f2a364',
                type: 'article',
              },
            ],
          },
          {
            key: 'gulp-grunt',
            iconUrl: `${DEVICON}/build-tools/grunt.svg`,
            iconAlt: 'JavaScript',
            links: [
              { label: 'Gulp', url: 'https://gulpjs.com/', type: 'docs' },
              {
                label: 'Getting To Know Gulp',
                url: 'https://medium.com/the-web-crunch-publication/getting-to-know-gulp-9a13c6f7f592',
                type: 'article',
              },
              {
                label: 'Понимаем и работаем с gulp',
                url: 'https://habr.com/ru/articles/344626/',
                type: 'article',
              },
              {
                label: 'Grunt. The JavaScript Task Runner',
                url: 'https://gruntjs.com/',
                type: 'docs',
              },
              {
                label: 'What is Grunt for?',
                url: 'https://stackoverflow.com/questions/29190910/what-is-grunt-for',
                type: 'article',
              },
              {
                label: 'Grunt, инструмент для сборки javascript проектов',
                url: 'https://habr.com/ru/articles/148274/',
                type: 'article',
              },
            ],
          },
        ],
      },
    ],
  },
];

async function main() {
  console.log('Seeding roadmap data...');

  // Clear existing roadmap data
  await prisma.roadmapLink.deleteMany();
  await prisma.roadmapItem.deleteMany();
  await prisma.roadmapCategory.deleteMany();
  await prisma.roadmapSection.deleteMany();

  for (let si = 0; si < roadmapData.length; si++) {
    const sectionData = roadmapData[si];
    const section = await prisma.roadmapSection.create({
      data: {
        key: sectionData.key,
        isNew: sectionData.isNew ?? false,
        status: 'PUBLISHED',
        sortOrder: si,
      },
    });

    for (let ci = 0; ci < sectionData.categories.length; ci++) {
      const catData = sectionData.categories[ci];
      const category = await prisma.roadmapCategory.create({
        data: {
          sectionId: section.id,
          key: catData.key,
          sortOrder: ci,
        },
      });

      for (let ii = 0; ii < catData.items.length; ii++) {
        const itemData = catData.items[ii];
        const item = await prisma.roadmapItem.create({
          data: {
            categoryId: category.id,
            key: itemData.key,
            iconUrl: itemData.iconUrl,
            iconAlt: itemData.iconAlt,
            sortOrder: ii,
          },
        });

        if (itemData.links.length > 0) {
          await prisma.roadmapLink.createMany({
            data: itemData.links.map((link, li) => ({
              itemId: item.id,
              label: link.label,
              url: link.url,
              type: link.type ?? null,
              sortOrder: li,
            })),
          });
        }
      }
    }
  }

  const counts = await Promise.all([
    prisma.roadmapSection.count(),
    prisma.roadmapCategory.count(),
    prisma.roadmapItem.count(),
    prisma.roadmapLink.count(),
  ]);

  console.log(
    `Seeded: ${counts[0]} sections, ${counts[1]} categories, ${counts[2]} items, ${counts[3]} links`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
