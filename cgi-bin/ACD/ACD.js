#!/bin/perl

##########################################################################################
#                                                                                        #
# AJAX Cross Domain - ACD                                                                #
# ---------------------------------------------------------------------------------------#
# Full documentation and license: see http://www.ajax-cross-domain.com/                  #
# Author: Bart Van der Donck http://www.dotinternet.be/                                  #
# ---------------------------------------------------------------------------------------#
# For installation procedure, see http://www.ajax-cross-domain.com/#Installation         #
# ---------------------------------------------------------------------------------------#
# This software is provided "as is" without any express or implied warranty.             #
#                                                                                        #
##########################################################################################


##########################################################################################
# Configuration area                                                                     #
##########################################################################################

# which query-strings are allowed to call this script ?
my @allowed_uris = (
                      'uri=(http://www.google.com)',
                      'uri=(http://www.411.ca/search/%23!q=restaurants)',
                      'uri=(http://www.google.com/)',
                      'uri=(http://216.92.131.147/dotserv/ACD/?name=john)',
                      'uri=(http://www.microsoft.com/)',
                      'uri=(http://216.92.131.147/dotserv/ACD/runit/post.cgi)&method=post'
                        .'&postdata=(name=fred&email=fred@fred.com)',
                      'uri=(http://216.92.131.147/dotserv/ACD/runit/post.cgi)&postdata='
                        .'(name=John%20Johnson&email=john@gmail.com&company='
                        .'C%26A%20%28until%20May%29&sum=1%2B1%3D2)',
                      'uri=(http://www.google.com)&headers=(User-Agent='
                        .'My%20cool%20User-Agent&Content-Language=en)',
                      'uri=(http://216.92.131.147/dotserv/ACD/runit/binary.jpg)&method=get',
                      'uri=(http://216.92.131.147/dotserv/ACD/runit/binary.jpg)&base64=1',
                      'uri=(http/www.google.com)',
                      'uri=(http://www.google.com)&headers=(Cookie=foo%3Dbar%3D%3D'
                       .'&someheader=somevalue)',
                      'uri=(http://www.google.com)&headers='
                       .'(cookie=foo%3Dbar;%20foo2%3Dbar2;%20emptycookie%3D)'
                   );

# which timeout to use for the remote request (in seconds) ?
my $timeout = 30;

# which is the default request method when not specified (case sensitive) ?
my $method = 'GET';

# what is the maximum size of the response in KB ?
my $maxsize = 1000;

# as which content-type should ACD.js be served ?
my $js_content_type = 'application/x-javascript';

# In which character set should ACD.js be served ?  e.g. 'UTF-8', 'ISO-8859-1', ...
# Set " my $charset = undef; " if you want to keep the character set of the remote
# resource
my $charset = undef;

# What is the default User-Agent header that is offered to the remote resource ?
my $useragent = 'AJAX Cross Domain';


##########################################################################################
# Load needed modules, those should be present in default Perl 5.6+ installations        #
##########################################################################################

use strict;
use warnings;
use CGI::Carp qw(fatalsToBrowser);
use LWP::UserAgent;
use HTTP::Request;
use HTTP::Headers;
use MIME::Base64;
use subs 'format_output';


##########################################################################################
# Decide which remote resources we allow                                                 #
##########################################################################################

my $OKflag = 0;
my $auth_failed = 'AJAX Cross Domain discovered that you cannot perform the remote '
                . 'request. The query-string after ACD.js must be set as an allowed '
                . 'query-string in the configuration area of ACD.js.';

# Check '&' versus '&amp;' versions
my $amp = $ENV{'QUERY_STRING'};
$amp =~s/&/&amp;/ig;
my $amp2 = $ENV{'QUERY_STRING'};
$amp2 =~s/&amp;/&/ig;

for (@allowed_uris)  {
  $OKflag = 1 if ($_ eq $ENV{'QUERY_STRING'} || $_ eq $amp || $_ eq $amp2);
}

if ($OKflag != 1)  {
  format_output($auth_failed, $auth_failed, $auth_failed, $auth_failed, $auth_failed);
}


##########################################################################################
# Parse the query-string                                                                 #
##########################################################################################

# Parse the bracket-separated parts
# ---------------------------------

my $uri = $ENV{'QUERY_STRING'};
$uri =~ s/(.*)(uri=\()(.*?)(\))(.*)/$3/ig;

my $postdata = $ENV{'QUERY_STRING'};
$postdata =~ s/(.*)(postdata=\()(.*?)(\))(.*)/$3/ig;
$postdata = '' if $postdata eq $ENV{'QUERY_STRING'};

my $headers = $ENV{'QUERY_STRING'};
$headers =~ s/(.*)(headers=\()(.*?)(\))(.*)/$3/ig;
$headers = '' if $headers eq $ENV{'QUERY_STRING'};

for ($headers)  {
  tr/+/ /;
  s/%([A-Fa-f\d]{2})/chr hex $1/eg;
}


# Parse the remaining parts
# -------------------------

my %param;

my $rest = $ENV{'QUERY_STRING'};
for ($postdata, $uri, $headers)  {
  $rest =~ s/\Q$_//g if $_ ne '';
}

for (split/&/, $rest)  {
  my @t_s = split /=/, $_;
  my $name = $t_s[0];
  s/^\Q$t_s[0]=//i;
  my $value = $_;
  for ($name, $value)  {
    tr/+/ /;
    s/%([A-Fa-f\d]{2})/chr hex $1/eg;
  }
  $param{$name} = $value;
}

$method = uc $param{method} if defined $param{method};
$method = 'POST' if $postdata ne '';


##########################################################################################
# Escapes for left and right brackets inside $uri, $headers and $postdata                #
##########################################################################################

for ($uri, $headers, $postdata) {
  s/%28/(/g;
  s/%29/)/g;
  s/%2528/%28/g;
  s/%2529/%29/g;
}


###########################################################################################
# Split headers in name/value pairs                                                       #
###########################################################################################

my %add_header;
$add_header{'User-Agent'} = $useragent;

for (split /&/, $headers)  {
  my @t_s = split /=/, $_;
  my $name = $t_s[0];
  s/^\Q$t_s[0]=//i;
  my $value = $_;
  for ($name, $value)  {
    tr/+/ /;
    s/%([A-Fa-f\d]{2})/chr hex $1/eg;
  }
  $add_header{$name} = $value;
}


###########################################################################################
# Fire off the request                                                                    #
###########################################################################################

# General parameters of the request
# ---------------------------------

my $ua = new LWP::UserAgent;
$ua->max_size($maxsize * 1024);
$ua->timeout($timeout);
$ua->parse_head(undef);

# Perform request
# ---------------

my $req = HTTP::Request->new($method, $uri);
if ($method eq 'POST')  {
  $req->content_type('application/x-www-form-urlencoded');
  $req->header('Content-Length' => length($postdata));
}
$req->header(%add_header);
$req->content($postdata);

# Receive response
# ----------------

my $res = $ua->request($req);

if ($res->is_success) {
  format_output(
                 $res->content,
                 $res->as_string,
                 $res->status_line,
                 '',
                 $req->as_string
               );
} 
else  {
  format_output(
                 $res->content, 
                 $res->as_string,
                 $res->status_line,
                 'Request failed', 
                 $req->as_string
               );
}       


###########################################################################################
# Last possibility: if no content has been outputted yet, show error                      #
###########################################################################################

format_output(
               $res->content, 
               $res->as_string, 
               $res->status_line, 
               'Unexpected error', 
               $req->as_string
             );

  
###########################################################################################
# Output formatter                                                                        #
###########################################################################################

sub format_output  {

    # General regexes and headers
    # ---------------------------

    my @inp = @_;
    for (@inp)  {
      s/\\/\\\\/g;
      s/'/\\'/g;
      s/\//\\\//g;
      s/(\r\n|\r)/\n/g;
    }

    my ($responseText, $getAllResponseHeaders, $status, $error, $fullrequest) = @inp;
    $responseText = encode_base64($responseText) 
      if ( defined $param{'base64'} && $param{'base64'} eq '1' );

    my $output = "Content-Type: $js_content_type\r\n\r\n";

    $output.=qq{// ----------------------------------------------------------------\r\n};
    $output.=qq{// INITIALIZATION\r\n};
    $output.=qq{// ----------------------------------------------------------------\r\n};
    $output.=qq{var ACD = new Object();\r\n\r\n\r\n};


    # What was the sent request ?
    # ---------------------------

    $output.=qq{// ----------------------------------------------------------------\r\n};
    $output.=qq{// ACD.request - FULL REQUEST THAT WAS SENT\r\n};
    $output.=qq{// ----------------------------------------------------------------\r\n};
    $output.=qq{ACD.request = '';\r\n};
    if (defined $fullrequest)  {
      for (split /\n/, $fullrequest)  {
        $output.=qq{ACD.request += '$_\\r\\n';\r\n};
      }
    }
    $output.=qq{\r\n\r\n};
    
    
    # What was the HTTP status code of the response ?
    # -----------------------------------------------

    $output.=qq{// ----------------------------------------------------------------\r\n};
    $output.=qq{// ACD.status - HTTP RESPONSE STATUS CODE\r\n};
    $output.=qq{// ----------------------------------------------------------------\r\n};
    $output.=qq{ACD.status = '$status';\r\n};
    $output.=qq{\r\n\r\n};


    # What are the headers of the response ?
    # --------------------------------------

    $output.=qq{// ----------------------------------------------------------------\r\n};
    $output.=qq{// ACD.getAllResponseHeaders - FULL HEADERS OF RESPONSE\r\n};
    $output.=qq{// ----------------------------------------------------------------\r\n};
    $output.=qq{ACD.getAllResponseHeaders = '';\r\n};

    my %getResponseHeader;
    my $spaces = 0;

    if (defined $getAllResponseHeaders)  {
      $getAllResponseHeaders = (split /\n\n/, $getAllResponseHeaders)[0];
      for (split /\n/, $getAllResponseHeaders)  {
        $output.=qq{ACD.getAllResponseHeaders += '$_\\r\\n';\r\n};
        my @key_property = split /: /, $_;
        if (defined $key_property[1] && $key_property[1] ne '')  {
          $getResponseHeader{$key_property[0]} = $key_property[1];
          $spaces = length($key_property[0]) if $spaces < length($key_property[0]);
        }
      }
      $output.=qq{\r\n\r\n};
      $output.=qq{// ----------------------------------------------------------------\r\n};
      $output.=qq{// ACD.getResponseHeader - METHOD WITH EVERY KEY/VALUE HEADER\r\n};
      $output.=qq{// ----------------------------------------------------------------\r\n};
      $output.=qq{ACD.getResponseHeader = {};\r\n};
      while ( my ($key, $val) = each %getResponseHeader)  {
        $output.=qq{ACD.getResponseHeader['$key'] } . ' ' 
                 x ($spaces - length($key)) . qq{= '$val';\r\n};

        if (uc $key eq 'CONTENT-TYPE' && $val =~ /charset=/i && not defined $charset)  {
          $charset = $val;
          $charset =~ s/(.*)(charset=)(.+)/$3/i;
        }
      }
    }

    $output.=qq{\r\n\r\n};
    $output =~ s/\Q$js_content_type/$js_content_type; charset=$charset/ if defined $charset;


    # What was the body of the response ?
    # -----------------------------------

    $output.=qq{// ----------------------------------------------------------------\r\n};
    $output.=qq{// ACD.responseText - BODY OF RESPONSE\r\n};
    $output.=qq{// ----------------------------------------------------------------\r\n};
    $output.=qq{ACD.responseText = '';\r\n};

    if (defined $responseText)  {
      for (split /\n/, $responseText)  {
        $output.=qq{ACD.responseText += '$_\\r\\n';\r\n};
      }
    }
    $output.=qq{\r\n\r\n};


    # Were there any errors ?
    # -----------------------

    $output.=qq{// ----------------------------------------------------------------\r\n};
    $output.=qq{// ACD.error - ERRORS\r\n};
    $output.=qq{// ----------------------------------------------------------------\r\n};
    $output.=qq{ACD.error = '$error';\r\n};
    $output.=qq{\r\n\r\n};


    # Output & end
    # ------------

    print $output;
    exit;
}


__END__
