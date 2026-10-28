<?php
/*
 * Plugin Name:      Stands Showroom 3D
 * Description:      Carrusel 3D ligero de stands comerciales con logos por empresa, integrado sin iframe. Shortcode: [stands_showroom]
 * Version:          1.0.0
 * Author:           Stands Showroom
 * Text Domain:      stands-showroom
 */

defined('ABSPATH') || exit;

define('STSHOW_VER', '1.0.0');

function stshow_url($path = '') {
  return plugin_dir_url(__FILE__) . $path;
}

function stshow_assets() {
  wp_enqueue_style('stands-showroom', stshow_url('css/stands-showroom.css'), [], STSHOW_VER);
  wp_enqueue_script('stands-showroom-data', stshow_url('js/companies-data.js'), [], STSHOW_VER, false);
}

function stshow_shortcode($atts) {
  $atts = shortcode_atts([
    'height' => '66vh',
    'title'  => 'Stands Comerciales',
    'eager'  => '0'
  ], $atts, 'stands_showroom');

  stshow_assets();

  $uid = 'stshow-' . wp_unique_id();

  ob_start(); ?>
  <div class="stshow" data-stshow data-height="<?php echo esc_attr($atts['height']); ?>" data-title="<?php echo esc_attr($atts['title']); ?>"<?php echo $atts['eager'] === '1' ? ' data-eager="1"' : ''; ?> id="<?php echo esc_attr($uid); ?>"></div>
  <script type="module" src="<?php echo esc_url(stshow_url('js/app.js')); ?>?ver=<?php echo esc_attr(STSHOW_VER); ?>"></script>
  <?php
  return ob_get_clean();
}

add_shortcode('stands_showroom', 'stshow_shortcode');
