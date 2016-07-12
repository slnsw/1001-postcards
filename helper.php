<?php

/**
 * This script imports a curated .csv file and generates an XML file inline with obtaining the necessary assets from ACMS for the project.
 */

use \Eventviva\ImageResize;

define('IMG_DIR', 'dist/images');
define('DATA_PATH', 'dist/data');

class Helper
{

    private $_path = '';
    private $_nodes = array();
    private $_headers = array();
    private $_options = array(
        'group_by' => '',
        'resources' => array(),
        'limit' => 0,
    );
    private $_group = array();
    private $_errors = array();
    private $_requests = array();
    private $_responses = array();
    private $_resources = array();

    public function __construct($path, $options = array())
    {
        if(is_string($path)){
            $this->_path = $path;
            $info = pathinfo($this->_path);
            if(!isset($info['extension'])
                || $info['extension'] !== 'csv'){
                $this->_errors[] = 'Incorrect extension';
                return;
            }
        }else{
            $this->_errors[] = 'Path is not accessible';
            return;
        }
        if(is_array($options)){
            $this->_options = array_merge($this->_options, $options);
        }
        if(empty($this->_options['group_by'])){
            $this->_errors[] = 'The \'group_by\' option cannot be empty';
            return;
        }
        $this->_parse()->_load();
    }

    private function _parse()
    {
        // If there aren't any errors, proceed.
        if(empty($this->getErrors())){
            // If the file exists and is readable, open the file and continue to transverse.
            if(file_exists($this->_path)
                && is_readable($this->_path)){
                if(($fh = fopen($this->_path, 'r')) !== FALSE){
                    // Initialise the row counter.
                    $i = 0;
                    // Iterate through the file rows.
                    while(($row = fgetcsv($fh)) !== FALSE){
                        if($this->_options['limit'] !== 0
                            && $i === $this->_options['limit']){
                            break;
                        }
                        // If the row has data.
                        if(count($row) > 0){
                            if($i === 0
                                && empty($this->_headers)){
                                $this->_setHeaders($row);
                                continue;
                            }else{
                                $this->_setNode($row, $i);
                            }                    
                        }
                        // Increment the row counter #.
                        $i++;
                    }
                }else{
                    $this->_errors[] = 'File resource handle could not be created.';
                }
            }else{
                $this->_errors[] = 'Path is not accessible';
            }
        }
        return $this;
    }

    private function _load()
    {
        require_once('extras/cache/src/ImageCache/ImageCache.php');   
        $cache = new ImageCache();
        $cache->cached_image_directory = __DIR__ . '/' . IMG_DIR . '/cached';            
        if(empty($this->getErrors())){
            foreach($this->_resources as $k => $v){
                $paths = array();           
                foreach($v as $k1 => $v1){
                    eval("\$paths[] = \$this->_nodes" . $v1 . ";");
                }
                if(($response = $this->_loadExecute($paths))){
                    foreach($response as $k1 => $v1){
                        $matches = array();
                        $regex = $this->_options['resources'][$k];
                        preg_match($regex, $v1, $matches);
                        if(!empty($matches)){
                            $image = pathinfo($matches[0]);
                            $path = IMG_DIR . '/' . $image['basename'];
                            @copy($matches[0], $path);              
                            eval("\$this->_nodes" . $this->_resources[$k][$k1] . " = \"" . str_replace(__DIR__ . '/', '', $path) . "\";");
                        }
                    }
                }
            }        
        }
        return $this;
    }

    private function _setNode($row, $i)
    {
        $this->_group['value'] = (!empty($row[$this->_group['index']]) ? base64_encode($row[$this->_group['index']]) : $this->_group['value']);
        foreach($row as $k => $v){
            if(base64_encode($row[$this->_group['index']]) == $this->_group['value']){
                $this->_nodes[$this->_group['value']]['meta'][$this->_headers[$k]] = $v;
            }else{
                $this->_nodes[$this->_group['value']][$i][$this->_headers[$k]] = $v;
                if(isset($this->_options['resources'])){
                    if(array_key_exists($this->_headers[$k], $this->_options['resources'])){
                        if(!empty($v)){
                            $this->_resources[$this->_headers[$k]][] = sprintf('[\'%s\'][%d][\'%s\']', $this->_group['value'], $i, $this->_headers[$k]);
                        }
                    }
                }
            }
        }
    }

    private function _setHeaders($row)
    {        
        foreach($row as $k => $v){
            $this->_headers[$k] = preg_replace('/[^A-Za-z0-9\_]+/', '_', strtolower($v));
            if($this->_headers[$k] === $this->_options['group_by']){
                $this->_group = array(
                    'index' => $k,
                    'value' => '',
                );
            }
        }
    }

    private function _loadExecute($paths)
    {
        if(empty($this->getErrors())){
            $responses = array();  
            $batches = array_chunk($paths, 10, TRUE);
            foreach($batches as $batch){
                $requests = array();                  
                $mh = curl_multi_init();                    
                foreach($batch as $path){
                        $ch = curl_init();
                        curl_setopt($ch, CURLOPT_URL, $path);
                        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
                        curl_setopt($ch, CURLOPT_HEADER, 0);  
                        curl_multi_add_handle($mh, $ch);             
                        $requests[] = $ch;                        
                }
                $active = NULL;
                do {
                    $mrc = curl_multi_exec($mh, $active);
                }while($mrc == CURLM_CALL_MULTI_PERFORM);

                while($active 
                            && $mrc == CURLM_OK){
                    if(curl_multi_select($mh) == -1){
                        usleep(1);
                    }
                    do{
                        $mrc = curl_multi_exec($mh, $active);
                    }while($mrc == CURLM_CALL_MULTI_PERFORM);
                }            
                foreach($requests as $request){
                        $response = curl_multi_getcontent($request);
                        curl_multi_remove_handle($mh, $ch);
                        $responses[] = $response;                
                }        
                curl_multi_close($mh);
            }
        }        
        return $responses;
    }

    public function getNodes()
    {
        if(!empty($this->_nodes)){
            return $this->_nodes;
        }
    }

    public function getErrors()
    {
        return $this->_errors;
    }

    public function export()
    {
        $xml = '';
        if(empty($this->getErrors())){
            $document = new DomDocument('1.0');
            $root = $document->createElement('root');
            foreach($this->_nodes as $k => $v){
                $meta = $v['meta'];
                unset($v['meta']);
                $group = $document->createElement('group');
                $name = $document->createAttribute('name');
                // Encode any HTML entities to prevent conflicts or errors.
                $name->value = $k;
                $group->appendChild($name);
                foreach($v as $k1 => $v1){
                    $node = $document->createElement('node');
                    foreach($v1 as $k2 => $v2){
                        // If the property is empty, attempt to take the value from the metadata (common values amoungst grouped nodes).
                        if(empty($v2)){
                            $v2 = (!empty($meta[$k2]) ? $meta[$k2] : '');
                        }                           
                        // Encode any HTML entities to prevent conflicts or errors.                     
                        $property = $document->createElement($k2, htmlentities($v2));
                        $node->appendChild($property);
                    }
                    $group->appendChild($node);
                }
                $root->appendChild($group);                
            }
            $document->appendChild($root);  
            $xml = $document->saveXML();          
        }
        return $xml;
    }

}

if(!isset($_GET['action'])){
    header('Location: helper.php?action=fetch');
    exit;
}

$path = DATA_PATH . '/set1.csv';
$options = array(
    'group_by' => 'album_caption',
    'resources' => array(
        'img_url' => "/http:\/\/acms\.sl\.nsw\.gov\.au\/_DAMx(\/|\\\)image\/[^\"]+/ims",
    ),
    'limit' => 0,
);      

switch($_GET['action']){
    case 'fetch':
        $helper = new Helper($path, $options);
        sleep(1);
        if(empty($helper->getErrors())){
            if(!empty($nodes = $helper->getNodes())){
                if(($xml = $helper->export())){
                    try{
                        if(($fh = fopen(DATA_PATH . '/set1.xml', 'w')) !== FALSE){
                            flock($fh, LOCK_EX);
                            fwrite($fh, $xml);
                            flock($fh, LOCK_UN);
                            fclose($fh);
                        }
                    }catch(Exception $e){}
                    header('Location: helper.php?action=cache');
                    exit;                        
                }
            }
        }    
        break;
    case 'cache':
        require_once('extras/cache/src/ImageCache/ImageCache.php');
        $cache = new ImageCache();
        $cache->cached_image_directory = __DIR__ . '/' . IMG_DIR . '/cached';         
        $file = DATA_PATH . '/set1.xml';
        if(($fh = fopen($file, 'r'))){
            $xml = fread($fh, filesize($file));
            $document = new DomDocument('1.0');
            $document->loadXML($xml);
            if(($nodes = $document->getElementsByTagName('node'))){
                foreach($nodes as $node){
                    if($node->hasChildNodes()){
                        foreach($node->childNodes as $meta){
                            if(array_key_exists($meta->nodeName, $options['resources'])){
                                try{
                                    if(!empty($meta->nodeValue)
                                        && ($path = $cache->cache($meta->nodeValue))){
                                        $info = pathinfo($path);
                                        $meta->nodeValue = IMG_DIR . '/cached/' . $info['basename'];                   
                                    }
                                }catch(Exception $e){}
                            }
                        }
                    }
                }
            }
            fclose($fh);            
        }
        if(($xml = $document->saveXML())){
            try{
                if(($fh = fopen(DATA_PATH . '/set1.xml', 'w')) !== FALSE){
                    flock($fh, LOCK_EX);
                    fwrite($fh, $xml);
                    flock($fh, LOCK_UN);
                    fclose($fh);
                }
            }catch(Exception $e){}      
            header('Location: helper.php?action=resize');
            exit;                          
        }        
        break;
    case 'resize':
        require_once('extras/resize/src/ImageResize.php');       
        $file = DATA_PATH . '/set1.xml';
        if(($fh = fopen($file, 'r'))){
            $xml = fread($fh, filesize($file));
            $document = new DomDocument('1.0');
            $document->loadXML($xml);
            if(($nodes = $document->getElementsByTagName('node'))){
                foreach($nodes as $node){
                    if($node->hasChildNodes()){
                        foreach($node->childNodes as $meta){
                            if(!empty($meta->nodeValue)
                                && array_key_exists($meta->nodeName, $options['resources'])){
                                $path = $meta->nodeValue;
                                $info = pathinfo($path);
                                $size = getimagesize($path);  
                                try{
                                    $resize = new ImageResize($path);     
                                    $resize->resizeToWidth($size[0] / 3);
                                    $meta->nodeValue = IMG_DIR . '/resized/' . $info['basename'];
                                    $resize->save($meta->nodeValue);  
                                }catch(Exception $e){}                      
                            }
                        }
                    }
                }
            }
            fclose($fh);
        }  
        if(($xml = $document->saveXML())){
            try{
                if(($fh = fopen(DATA_PATH . '/set1.xml', 'w')) !== FALSE){
                    flock($fh, LOCK_EX);
                    fwrite($fh, $xml);
                    flock($fh, LOCK_UN);
                    fclose($fh);
                }
            }catch(Exception $e){}     
            header('Content-type: text/xml');
            print $xml;
            exit;                               
        }        
        break;
}