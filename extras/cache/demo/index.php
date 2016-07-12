<?php require '../src/ImageCache/ImageCache.php'; ?>

<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title>Image Cache Test</title>
	<link href='http://fonts.googleapis.com/css?family=Open+Sans' rel='stylesheet' type='text/css'>
	<style>
		body {
			font-family: 'Open Sans', Helvetica, Arial, sans-serif;
		}
		img {
			max-width: 100%;
		}
	</style>
</head>
<body>
	<?php
		$imagecache = new ImageCache();
		$imagecache->cached_image_directory = dirname(__FILE__) . '/images/cached';

		$cached_src_one = $imagecache->cache( 'images/unsplash1.jpeg' );
		echo '<p>Original file size: ' . filesize($imagecache->image_src) . ' bytes</p>';
		echo '<p>PHPImageCach-ified file size: ' . filesize($imagecache->cached_filename) . ' bytes</p>';
		echo '<p>Total image size reduction: ' . (((filesize($imagecache->image_src) - filesize($imagecache->cached_filename)) / filesize($imagecache->image_src))*100) . '%</p>';
	?>
	<img src="<?php echo $cached_src_one; ?>" alt="">
	<hr>
	<?php
		$cached_src_two = $imagecache->cache( 'images/unsplash2.jpeg' );
		echo '<p>Original file size: ' . filesize($imagecache->image_src) . ' bytes</p>';
		echo '<p>PHPImageCach-ified file size: ' . filesize($imagecache->cached_filename) . ' bytes</p>';
		echo '<p>Total image size reduction: ' . (((filesize($imagecache->image_src) - filesize($imagecache->cached_filename)) / filesize($imagecache->image_src))*100) . '%</p>';
	?>
	<img src="<?php echo $cached_src_two; ?>" alt="">
	<hr>
	<?php
		$cached_src_two = $imagecache->cache( 'http://placehold.it/350x350' );
		echo 'Original file size: ' . filesize($imagecache->image_src) . ' bytes<br>';
		echo 'PHPImageCach-ified file size: ' . filesize($imagecache->cached_filename) . ' bytes<br>';
		echo 'Total image size reduction: ' . (((filesize($imagecache->image_src) - filesize($imagecache->cached_filename)) / filesize($imagecache->image_src))*100) . '%';
	?>
	<p>Because the "compressed" file size is larger than the original, a local copy of the original file will be server instead.</p>
	<img src="<?php echo $cached_src_two; ?>" alt="">

</body>
</html>
